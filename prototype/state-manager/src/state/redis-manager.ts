import Redis from 'ioredis';
import { City, District } from '../types';
import { logger } from '../utils/logger';

export class RedisStateManager {
  private client: Redis;
  private readonly keyPrefix = 'district:';
  private readonly cityGraphKey = 'city:graph';
  private readonly vehiclesKey = 'city:vehicles';
  private readonly cityMetadataKey = 'city:metadata';
  private snapshotManager: any = null;

  constructor(snapshotManager?: any) {
    this.snapshotManager = snapshotManager;
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
   * Initialize state from latest MongoDB snapshot or create empty state
   */
  async initializeEmptyState(): Promise<void> {
    logger.info('Initializing state in Redis');
    
    // Try to load latest snapshot from MongoDB
    if (this.snapshotManager) {
      try {
        const latestSnapshot = await this.snapshotManager.getLatestSnapshot();
        
        if (latestSnapshot) {
          logger.info('Found latest snapshot in MongoDB, restoring state...');
          await this.restoreFromSnapshot(latestSnapshot);
          logger.info('State restored from MongoDB snapshot successfully');
          return;
        } else {
          logger.info('No snapshots found in MongoDB, initializing fresh state');
        }
      } catch (error) {
        logger.error('Error loading snapshot from MongoDB:', error);
        logger.info('Proceeding with fresh state initialization');
      }
    }
    
    // Initialize fresh state if no snapshot found
    logger.info('Creating fresh state in Redis');
    
    // Set default city metadata
    await this.client.set(
      this.cityMetadataKey,
      JSON.stringify({
        name: "L'Aquila",
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
      })
    );

    // Initialize empty collections
    await this.client.set(this.vehiclesKey, JSON.stringify([]));

    // Load and initialize city graph from L'Aquila data
    await this.initializeCityGraph();

    logger.info('Fresh state initialized successfully');
  }

  /**
   * Restore state from a snapshot
   */
  private async restoreFromSnapshot(snapshot: City): Promise<void> {
    const pipeline = this.client.pipeline();
    
    // Restore city metadata
    pipeline.set(this.cityMetadataKey, JSON.stringify(snapshot.metadata));
    
    // Restore districts
    for (const district of snapshot.districts) {
      pipeline.set(`${this.keyPrefix}${district.districtId}:state`, JSON.stringify(district));
    }
    
    // Restore city-level data
    pipeline.set(this.vehiclesKey, JSON.stringify(snapshot.vehicles || []));
    pipeline.set(this.cityGraphKey, JSON.stringify(snapshot.cityGraph));
    
    await pipeline.exec();
    
    logger.info(`Restored ${snapshot.districts.length} districts and city-level data from snapshot`);
  }

  /**
   * Initialize city graph with L'Aquila data
   */
  private async initializeCityGraph(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const graphPath = path.join(__dirname, 'laquila-city-graph-overture.json');
      const graphData = await fs.readFile(graphPath, 'utf-8');
      const graph = JSON.parse(graphData);
      
      await this.client.set(this.cityGraphKey, JSON.stringify(graph));
      logger.info(`Initialized city graph with ${graph.nodes?.length || 0} nodes and ${graph.edges?.length || 0} edges`);
    } catch (error) {
      logger.error('Error loading city graph:', error);
      // Initialize with empty graph if file not found
      await this.client.set(this.cityGraphKey, JSON.stringify({ nodes: [], edges: [] }));
      logger.warn('Initialized with empty city graph');
    }
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
    const [metadata, districts, vehicles, cityGraph] = await Promise.all([
      this.getCityMetadata(),
      this.getAllDistricts(),
      this.getVehicles(),
      this.getCityGraph(),
    ]);

    return {
      cityId: 'laquila',
      timestamp: new Date(),
      metadata: metadata || {
        name: "L'Aquila",
        version: '1.0.0',
        lastUpdated: new Date(),
      },
      districts,
      vehicles: vehicles || [],
      cityGraph: cityGraph || { nodes: [], edges: [] },
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
   * Get vehicles data
   */
  async getVehicles() {
    const data = await this.client.get(this.vehiclesKey);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Update vehicles data
   */
  async updateVehicles(data: any): Promise<void> {
    await this.client.set(this.vehiclesKey, JSON.stringify(data));
    logger.debug('Updated vehicles data');
  }

  /**
   * Get city graph data
   */
  async getCityGraph() {
    const data = await this.client.get(this.cityGraphKey);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Update city graph data
   */
  async updateCityGraph(data: any): Promise<void> {
    await this.client.set(this.cityGraphKey, JSON.stringify(data));
    logger.debug('Updated city graph data');
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
        gateways: [],
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

  createPipeline(): any {
  return this.client.pipeline();
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
