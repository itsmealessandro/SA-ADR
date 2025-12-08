import { Consumer, EachBatchPayload, Kafka } from 'kafkajs';
import { RedisStateManager } from '../state/redis-manager';
import { SnapshotManager } from '../state/snapshot-manager';
import { logger } from '../utils/logger';

export class KafkaConsumerManager {
  private kafka: Kafka;
  private consumer: Consumer;
  private redisManager: RedisStateManager;
  private snapshotManager: SnapshotManager;
  private isRunning = false;

  // In-memory state cache for batching
  private stateCache = new Map<string, any>();
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private readonly FLUSH_INTERVAL_MS = 1000; // Flush every 1 second
  // private readonly _BATCH_SIZE = 1000; // Process 1000 messages per batch

  private readonly topics = [
    'sensors.environmental',
    'sensors.traffic',
    'buildings.occupancy',
    'buildings.sensors',
    'weather.stations',
    'traffic.graph',
    'transport.gps',
    'transport.stations',
    'emergency.incidents',
  ];

  constructor(redisManager: RedisStateManager, snapshotManager: SnapshotManager) {
    this.redisManager = redisManager;
    this.snapshotManager = snapshotManager;

    const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
    const clientId = process.env.KAFKA_CLIENT_ID || 'state-manager';
    const groupId = process.env.KAFKA_GROUP_ID || 'state-manager-group';

    this.kafka = new Kafka({
      clientId,
      brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.consumer = this.kafka.consumer({ 
      groupId,
      maxBytesPerPartition: 1048576, // 1MB per partition
      sessionTimeout: 30000,
    });
  }

  async start(): Promise<void> {
    try {
      await this.consumer.connect();
      logger.info('Kafka consumer connected');

      for (const topic of this.topics) {
        await this.consumer.subscribe({ topic, fromBeginning: false });
        logger.info(`Subscribed to topic: ${topic}`);
      }

      // Load initial state into cache
      await this.loadStateToCache();

      // Start periodic flush timer
      this.startFlushTimer();

      this.isRunning = true;

      // Use eachBatch for high-throughput processing
      await this.consumer.run({
        autoCommit: false, // Manual commit for better control
        partitionsConsumedConcurrently: 3, // Process 3 partitions in parallel
        eachBatch: async (payload: EachBatchPayload) => {
          await this.handleBatch(payload);
        },
      });

      logger.info('Kafka consumer started in batch mode');
    } catch (error) {
      logger.error('Error starting Kafka consumer:', error);
      throw error;
    }
  }

  /**
   * Load initial state from Redis into memory cache
   */
  private async loadStateToCache(): Promise<void> {
    try {
      const state = await this.redisManager.getCompleteState();
      
      // Cache districts
      for (const district of state.districts) {
        this.stateCache.set(`district:${district.districtId}`, district);
      }
      
      // Cache shared state
      this.stateCache.set('publicTransport', state.publicTransport);
      this.stateCache.set('emergencyServices', state.emergencyServices);
      
      logger.info(`Loaded state to cache: ${this.stateCache.size} entries`);
    } catch (error) {
      logger.error('Error loading state to cache:', error);
    }
  }

  /**
   * Handle batch of messages with parallel processing per district
   */
  private async handleBatch(payload: EachBatchPayload): Promise<void> {
    const { batch, resolveOffset, heartbeat, commitOffsetsIfNecessary } = payload;
    
    try {
      const startTime = Date.now();
      
      // Group messages by district/category for sequential processing within group
      const messageGroups = this.groupMessages(batch.messages, batch.topic);
      
      // Process each group in parallel (safe because different districts)
      await Promise.all(
        Array.from(messageGroups.entries()).map(async ([groupKey, messages]) => {
          for (const message of messages) {
            try {
              const data = JSON.parse(message.value!.toString());
              await this.processMessageInMemory(batch.topic, data);
              
              // Resolve offset for each processed message
              resolveOffset(message.offset);
            } catch (error) {
              logger.error(`Error processing message in group ${groupKey}:`, error);
            }
          }
          
          // Send heartbeat periodically
          await heartbeat();
        })
      );
      
      // Commit offsets
      await commitOffsetsIfNecessary();
      
      const duration = Date.now() - startTime;
      const throughput = duration > 0 ? Math.round(batch.messages.length / (duration / 1000)) : batch.messages.length;
      
      // Only log if batch has more than 1 message or took significant time
      if (batch.messages.length > 1 || duration > 10) {
        logger.info(`Processed batch: ${batch.messages.length} messages in ${duration}ms (${throughput} msg/s)`);
      }
      
    } catch (error) {
      logger.error('Error handling batch:', error);
    }
  }

  /**
   * Group messages by district to avoid race conditions
   */
  private groupMessages(messages: any[], _topic: string): Map<string, any[]> {
    const groups = new Map<string, any[]>();
    
    for (const message of messages) {
      if (!message.value) continue;
      
      try {
        const data = JSON.parse(message.value.toString());
        const groupKey = data.districtId || 'shared'; // Shared for publicTransport, emergency
        
        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(message);
      } catch (error) {
        logger.error('Error parsing message:', error);
      }
    }
    
    return groups;
  }

  /**
   * Process message updates in memory cache (no Redis I/O)
   */
  private async processMessageInMemory(topic: string, data: any): Promise<void> {
    switch (topic) {
      case 'sensors.environmental':
      case 'sensors.traffic':
        this.updateSensorInCache(data);
        break;

      case 'buildings.occupancy':
        this.updateBuildingOccupancyInCache(data);
        break;

      case 'buildings.sensors':
        this.updateSensorInCache(data);
        break;

      case 'weather.stations':
        this.updateWeatherInCache(data);
        break;

      case 'traffic.graph':
        this.updateTrafficGraphInCache(data);
        break;

      case 'transport.gps':
      case 'transport.stations':
        this.updatePublicTransportInCache(data);
        break;

      case 'emergency.incidents':
        this.updateEmergencyInCache(data);
        break;
    }
  }

  /**
   * Update sensor in memory cache
   */
  private updateSensorInCache(data: any): void {
    const { districtId, sensorId, type, value, unit, status, lastUpdated, location, metadata } = data;
    if (!districtId || !sensorId) return;

    const cacheKey = `district:${districtId}`;
    let district = this.stateCache.get(cacheKey);

    if (!district) {
      district = {
        districtId,
        name: `District ${districtId}`,
        location: {
          centerLatitude: location?.latitude || 0,
          centerLongitude: location?.longitude || 0,
          boundaries: { north: 0, south: 0, east: 0, west: 0 },
        },
        sensors: [],
        buildings: [],
        weatherStations: [],
        districtGraph: { nodes: [], edges: [] },
      };
      this.stateCache.set(cacheKey, district);
    }

    const sensorIndex = district.sensors.findIndex((s: any) => s.sensorId === sensorId);

    if (sensorIndex !== -1) {
      district.sensors[sensorIndex] = {
        ...district.sensors[sensorIndex],
        value,
        status: status || district.sensors[sensorIndex].status,
        lastUpdated: new Date(lastUpdated || Date.now()),
        ...(location && { location }),
        ...(metadata && { metadata }),
      };
    } else {
      district.sensors.push({
        sensorId,
        type,
        value,
        unit,
        status: status || 'active',
        lastUpdated: new Date(lastUpdated || Date.now()),
        location,
        metadata,
      });
    }
  }

  /**
   * Update building occupancy in cache
   */
  private updateBuildingOccupancyInCache(data: any): void {
    const { districtId, buildingId, currentOccupancy, totalCapacity } = data;
    if (!districtId || !buildingId) return;

    const district = this.stateCache.get(`district:${districtId}`);
    if (!district) return;

    const buildingIndex = district.buildings.findIndex((b: any) => b.buildingId === buildingId);
    if (buildingIndex !== -1) {
      district.buildings[buildingIndex].currentOccupancy = currentOccupancy;
      district.buildings[buildingIndex].occupancyRate = currentOccupancy / totalCapacity;
    }
  }

  /**
   * Update weather station in cache
   */
  private updateWeatherInCache(data: any): void {
    const { districtId, stationId, readings, status, lastUpdated } = data;
    if (!districtId || !stationId) return;

    const district = this.stateCache.get(`district:${districtId}`);
    if (!district) return;

    const stationIndex = district.weatherStations.findIndex((ws: any) => ws.stationId === stationId);
    if (stationIndex !== -1) {
      district.weatherStations[stationIndex].readings = readings;
      district.weatherStations[stationIndex].status = status || district.weatherStations[stationIndex].status;
      district.weatherStations[stationIndex].lastUpdated = new Date(lastUpdated || Date.now());
    }
  }

  /**
   * Update traffic graph in cache
   */
  private updateTrafficGraphInCache(data: any): void {
    const { districtId, edgeId, trafficConditions } = data;
    if (!districtId || !edgeId) return;

    const district = this.stateCache.get(`district:${districtId}`);
    if (!district) return;

    const edgeIndex = district.districtGraph.edges.findIndex((e: any) => e.edgeId === edgeId);
    if (edgeIndex !== -1) {
      district.districtGraph.edges[edgeIndex].trafficConditions = trafficConditions;
      district.districtGraph.edges[edgeIndex].lastUpdated = new Date();
    }
  }

  /**
   * Update public transport in cache
   */
  private updatePublicTransportInCache(data: any): void {
    let currentData = this.stateCache.get('publicTransport') || { buses: [], stations: [] };

    if (data.busId) {
      const busIndex = currentData.buses.findIndex((b: any) => b.busId === data.busId);
      if (busIndex !== -1) {
        currentData.buses[busIndex] = { ...currentData.buses[busIndex], ...data };
      } else {
        currentData.buses.push(data);
      }
    } else if (data.stationId) {
      const stationIndex = currentData.stations.findIndex((s: any) => s.stationId === data.stationId);
      if (stationIndex !== -1) {
        currentData.stations[stationIndex] = { ...currentData.stations[stationIndex], ...data };
      } else {
        currentData.stations.push(data);
      }
    }

    this.stateCache.set('publicTransport', currentData);
  }

  /**
   * Update emergency services in cache
   */
  private updateEmergencyInCache(data: any): void {
    let currentData = this.stateCache.get('emergencyServices') || { incidents: [], units: [] };

    if (data.incidentId) {
      const incidentIndex = currentData.incidents.findIndex((i: any) => i.incidentId === data.incidentId);
      if (incidentIndex !== -1) {
        currentData.incidents[incidentIndex] = { ...currentData.incidents[incidentIndex], ...data };
      } else {
        currentData.incidents.push(data);
      }
    } else if (data.unitId) {
      const unitIndex = currentData.units.findIndex((u: any) => u.unitId === data.unitId);
      if (unitIndex !== -1) {
        currentData.units[unitIndex] = { ...currentData.units[unitIndex], ...data };
      } else {
        currentData.units.push(data);
      }
    }

    this.stateCache.set('emergencyServices', currentData);
  }

  /**
   * Start periodic timer to flush cache to Redis
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      await this.flushCacheToRedis();
    }, this.FLUSH_INTERVAL_MS);

    logger.info(`Started flush timer (interval: ${this.FLUSH_INTERVAL_MS}ms)`);
  }

  /**
   * Flush in-memory cache to Redis in bulk
   */
  private async flushCacheToRedis(): Promise<void> {
    if (this.stateCache.size === 0) return;

    const startTime = Date.now();

    try {
      // Use Redis pipeline for bulk writes
      const pipeline = this.redisManager.createPipeline();
      let operationCount = 0;

      for (const [key, value] of this.stateCache.entries()) {
        if (key.startsWith('district:')) {
          const districtId = key.replace('district:', '');
          pipeline.set(`district:${districtId}:state`, JSON.stringify(value));
          operationCount++;
        } else if (key === 'publicTransport') {
          pipeline.set('city:publicTransport', JSON.stringify(value));
          operationCount++;
        } else if (key === 'emergencyServices') {
          pipeline.set('city:emergencyServices', JSON.stringify(value));
          operationCount++;
        }
      }

      await pipeline.exec();

      const duration = Date.now() - startTime;
      logger.info(`Flushed ${operationCount} keys to Redis in ${duration}ms`);

      // Trigger snapshot check
      await this.snapshotManager.incrementChangeCounter(
        () => this.redisManager.getCompleteState(),
        operationCount
      );

    } catch (error) {
      logger.error('Error flushing cache to Redis:', error);
    }
  }

  async stop(): Promise<void> {
    if (this.isRunning) {
      // Stop flush timer
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
      }

      // Final flush
      await this.flushCacheToRedis();

      await this.consumer.disconnect();
      this.isRunning = false;
      logger.info('Kafka consumer stopped');
    }
  }

  isConnected(): boolean {
    return this.isRunning;
  }
}