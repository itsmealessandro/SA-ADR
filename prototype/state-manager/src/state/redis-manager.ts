import Redis from 'ioredis';
import { City, District } from '../types';
import { logger } from '../utils/logger';

export class RedisStateManager {
  private client: Redis;
  private readonly keyPrefix = 'district:';
  // private readonly _cityGraphKey = 'city:graph';
  private readonly publicTransportKey = 'city:publicTransport';
  private readonly emergencyServicesKey = 'city:emergencyServices';
  private readonly cityMetadataKey = 'city:metadata';

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('connect', () => {
      logger.info('Connected to Redis');
    });

    this.client.on('error', (err) => {
      logger.error('Redis error:', err);
    });
  }

  /**
   * Initialize empty state
   */
  async initializeEmptyState(): Promise<void> {
    logger.info('Initializing empty state in Redis');
    
    // Set default city metadata
    await this.client.set(
      this.cityMetadataKey,
      JSON.stringify({
        name: 'Smart City',
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
      })
    );

    // Initialize empty collections
    await this.client.set(this.publicTransportKey, JSON.stringify({ buses: [], stations: [] }));
    await this.client.set(this.emergencyServicesKey, JSON.stringify({ incidents: [], units: [] }));

    logger.info('Empty state initialized successfully');
  }

  /**
   * Get district state by ID
   */
  async getDistrictState(districtId: string): Promise<District | null> {
    const key = `${this.keyPrefix}${districtId}:state`;
    const data = await this.client.get(key);
    
    if (!data) {
      return null;
    }

    return JSON.parse(data) as District;
  }

  /**
   * Update district state
   */
  async updateDistrictState(district: District): Promise<void> {
    const key = `${this.keyPrefix}${district.districtId}:state`;
    await this.client.set(key, JSON.stringify(district));
    logger.debug(`Updated district state: ${district.districtId}`);
  }

  /**
   * Get all district IDs
   */
  async getAllDistrictIds(): Promise<string[]> {
    const pattern = `${this.keyPrefix}*:state`;
    const keys = await this.client.keys(pattern);
    
    return keys.map(key => {
      const match = key.match(/district:([^:]+):state/);
      return match ? match[1] : '';
    }).filter(id => id !== '');
  }

  /**
   * Get all districts in parallel
   */
  async getAllDistricts(): Promise<District[]> {
    const districtIds = await this.getAllDistrictIds();
    
    if (districtIds.length === 0) {
      return [];
    }

    const districts = await Promise.all(
      districtIds.map(id => this.getDistrictState(id))
    );

    return districts.filter(d => d !== null) as District[];
  }

  /**
   * Get complete city state
   */
  async getCompleteState(): Promise<City> {
    const [metadata, districts, publicTransport, emergencyServices] = await Promise.all([
      this.getCityMetadata(),
      this.getAllDistricts(),
      this.getPublicTransport(),
      this.getEmergencyServices(),
    ]);

    return {
      cityId: 'CITY-001',
      timestamp: new Date(),
      metadata: metadata || {
        name: 'Smart City',
        version: '1.0.0',
        lastUpdated: new Date(),
      },
      districts,
      publicTransport: publicTransport || { buses: [], stations: [] },
      emergencyServices: emergencyServices || { incidents: [], units: [] },
    };
  }

  /**
   * Get city metadata
   */
  async getCityMetadata() {
    const data = await this.client.get(this.cityMetadataKey);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Get public transport data
   */
  async getPublicTransport() {
    const data = await this.client.get(this.publicTransportKey);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Update public transport data
   */
  async updatePublicTransport(data: any): Promise<void> {
    await this.client.set(this.publicTransportKey, JSON.stringify(data));
    logger.debug('Updated public transport data');
  }

  /**
   * Get emergency services data
   */
  async getEmergencyServices() {
    const data = await this.client.get(this.emergencyServicesKey);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Update emergency services data
   */
  async updateEmergencyServices(data: any): Promise<void> {
    await this.client.set(this.emergencyServicesKey, JSON.stringify(data));
    logger.debug('Updated emergency services data');
  }

  /**
   * Merge sensor data into district
   */
  async mergeSensorData(districtId: string, sensorData: any): Promise<void> {
    const district = await this.getDistrictState(districtId);
    
    if (!district) {
      // Create new district if doesn't exist
      const newDistrict: District = {
        districtId,
        name: `District ${districtId}`,
        location: {
          centerLatitude: 0,
          centerLongitude: 0,
          boundaries: { north: 0, south: 0, east: 0, west: 0 },
        },
        sensors: [sensorData],
        buildings: [],
        weatherStations: [],
        districtGraph: { nodes: [], edges: [] },
      };
      await this.updateDistrictState(newDistrict);
      return;
    }

    // Update existing sensor or add new one
    const sensorIndex = district.sensors.findIndex(s => s.sensorId === sensorData.sensorId);
    
    if (sensorIndex !== -1) {
      district.sensors[sensorIndex] = { ...district.sensors[sensorIndex], ...sensorData };
    } else {
      district.sensors.push(sensorData);
    }

    await this.updateDistrictState(district);
  }

  /**
   * Check if Redis is connected
   */
  async isConnected(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.client.quit();
    logger.info('Redis connection closed');
  }
}
