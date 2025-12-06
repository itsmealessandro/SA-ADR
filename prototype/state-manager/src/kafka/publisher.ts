import * as jsondiffpatch from 'jsondiffpatch';
import { Kafka, Producer } from 'kafkajs';
import { RedisStateManager } from '../state/redis-manager';
import { City } from '../types';
import { logger } from '../utils/logger';

export class StatePublisher {
  private kafka: Kafka;
  private producer: Producer;
  private redisManager: RedisStateManager;
  private isRunning = false;
  private diffPatcher: jsondiffpatch.DiffPatcher;
  
  // Publishing timers
  private fullStateTimer: NodeJS.Timeout | null = null;
  private incrementalStateTimer: NodeJS.Timeout | null = null;
  
  // Last published state for diff calculation
  private lastPublishedState: City | null = null;
  
  // Kafka topics
  private readonly FULL_STATE_TOPIC = 'state.full';
  private readonly INCREMENTAL_STATE_TOPIC = 'state.incremental';
  
  // Publishing intervals
  private readonly FULL_STATE_INTERVAL_MS: number;
  private readonly INCREMENTAL_STATE_INTERVAL_MS: number;

  constructor(redisManager: RedisStateManager) {
    this.redisManager = redisManager;

    const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
    const clientId = process.env.KAFKA_CLIENT_ID || 'state-manager';

    this.kafka = new Kafka({
      clientId: `${clientId}-publisher`,
      brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });

    // Initialize jsondiffpatch for incremental updates
    this.diffPatcher = jsondiffpatch.create({
      objectHash: (obj: any) => {
        return obj.id || obj.sensorId || obj.districtId || obj.buildingId || obj.busId || obj.incidentId || JSON.stringify(obj);
      },
      arrays: {
        detectMove: true,
      },
    });

    // Get intervals from environment or use defaults
    this.FULL_STATE_INTERVAL_MS = parseInt(process.env.FULL_STATE_PUBLISH_INTERVAL_MS || '60000'); // 1 minute
    this.INCREMENTAL_STATE_INTERVAL_MS = parseInt(process.env.INCREMENTAL_STATE_PUBLISH_INTERVAL_MS || '5000'); // 5 seconds
  }

  /**
   * Start the state publisher
   */
  async start(): Promise<void> {
    try {
      await this.producer.connect();
      logger.info('State publisher connected to Kafka');

      // Get initial state
      this.lastPublishedState = await this.redisManager.getCompleteState();

      // Start publishing timers
      this.startFullStatePublisher();
      this.startIncrementalStatePublisher();

      this.isRunning = true;
      logger.info('State publisher started');
    } catch (error) {
      logger.error('Error starting state publisher:', error);
      throw error;
    }
  }

  /**
   * Start periodic full state publishing
   */
  private startFullStatePublisher(): void {
    this.fullStateTimer = setInterval(async () => {
      try {
        await this.publishFullState();
      } catch (error) {
        logger.error('Error publishing full state:', error);
      }
    }, this.FULL_STATE_INTERVAL_MS);

    logger.info(`Started full state publisher (interval: ${this.FULL_STATE_INTERVAL_MS}ms)`);
  }

  /**
   * Start periodic incremental state publishing
   */
  private startIncrementalStatePublisher(): void {
    this.incrementalStateTimer = setInterval(async () => {
      try {
        await this.publishIncrementalState();
      } catch (error) {
        logger.error('Error publishing incremental state:', error);
      }
    }, this.INCREMENTAL_STATE_INTERVAL_MS);

    logger.info(`Started incremental state publisher (interval: ${this.INCREMENTAL_STATE_INTERVAL_MS}ms)`);
  }

  /**
   * Publish complete state to Kafka
   */
  private async publishFullState(): Promise<void> {
    try {
      const state = await this.redisManager.getCompleteState();

      await this.producer.send({
        topic: this.FULL_STATE_TOPIC,
        messages: [
          {
            key: state.cityId,
            value: JSON.stringify(state),
            timestamp: Date.now().toString(),
            headers: {
              type: 'full-state',
              version: '1.0',
            },
          },
        ],
      });

      // Update last published state
      this.lastPublishedState = JSON.parse(JSON.stringify(state));

      logger.info('Published full state to Kafka', {
        topic: this.FULL_STATE_TOPIC,
        cityId: state.cityId,
        districts: state.districts.length,
        timestamp: state.timestamp,
      });
    } catch (error) {
      logger.error('Error publishing full state:', error);
    }
  }

  /**
   * Publish incremental state (diff) to Kafka
   */
  private async publishIncrementalState(): Promise<void> {
    try {
      const currentState = await this.redisManager.getCompleteState();

      // Skip if no previous state
      if (!this.lastPublishedState) {
        logger.debug('No previous state for incremental update, skipping');
        this.lastPublishedState = JSON.parse(JSON.stringify(currentState));
        return;
      }

      // Calculate diff
      const delta = this.diffPatcher.diff(this.lastPublishedState, currentState);

      // Skip if no changes
      if (!delta) {
        logger.debug('No state changes detected, skipping incremental publish');
        return;
      }

      await this.producer.send({
        topic: this.INCREMENTAL_STATE_TOPIC,
        messages: [
          {
            key: currentState.cityId,
            value: JSON.stringify({
              cityId: currentState.cityId,
              timestamp: new Date(),
              delta,
            }),
            timestamp: Date.now().toString(),
            headers: {
              type: 'incremental-state',
              version: '1.0',
              previousTimestamp: this.lastPublishedState.timestamp.toString(),
            },
          },
        ],
      });

      // Update last published state
      this.lastPublishedState = JSON.parse(JSON.stringify(currentState));

      const deltaSize = JSON.stringify(delta).length;
      const fullSize = JSON.stringify(currentState).length;
      const compressionRatio = ((1 - deltaSize / fullSize) * 100).toFixed(1);

      logger.info('Published incremental state to Kafka', {
        topic: this.INCREMENTAL_STATE_TOPIC,
        cityId: currentState.cityId,
        deltaSize,
        fullSize,
        compressionRatio: `${compressionRatio}%`,
      });
    } catch (error) {
      logger.error('Error publishing incremental state:', error);
    }
  }

  /**
   * Manually trigger full state publish (useful for debugging or forced sync)
   */
  async triggerFullStatePublish(): Promise<void> {
    await this.publishFullState();
  }

  /**
   * Manually trigger incremental state publish
   */
  async triggerIncrementalStatePublish(): Promise<void> {
    await this.publishIncrementalState();
  }

  /**
   * Stop the state publisher
   */
  async stop(): Promise<void> {
    if (this.isRunning) {
      // Stop timers
      if (this.fullStateTimer) {
        clearInterval(this.fullStateTimer);
        this.fullStateTimer = null;
      }

      if (this.incrementalStateTimer) {
        clearInterval(this.incrementalStateTimer);
        this.incrementalStateTimer = null;
      }

      // Publish final full state before shutdown
      await this.publishFullState();

      await this.producer.disconnect();
      this.isRunning = false;
      logger.info('State publisher stopped');
    }
  }

  /**
   * Check if publisher is running
   */
  isPublishing(): boolean {
    return this.isRunning;
  }
}
