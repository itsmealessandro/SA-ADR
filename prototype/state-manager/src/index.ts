import dotenv from 'dotenv';
import http from 'http';
import { ApiServer } from './api/server';
import { KafkaConsumerManager } from './kafka/consumer';
import { StatePublisher } from './kafka/publisher';
import { RedisStateManager } from './state/redis-manager';
import { SnapshotManager } from './state/snapshot-manager';
import { logger } from './utils/logger';
import { WebSocketHandler } from './websocket/handler';

// Load environment variables
dotenv.config();

class StateManagerService {
  private redisManager!: RedisStateManager;
  private snapshotManager!: SnapshotManager;
  private kafkaConsumer!: KafkaConsumerManager;
  private statePublisher!: StatePublisher;
  private apiServer!: ApiServer;
  private wsHandler!: WebSocketHandler;
  private httpServer!: http.Server;

  async start(): Promise<void> {
    try {
      logger.info('Starting Digital Twin State Manager Service...');

      // Initialize Redis
      this.redisManager = new RedisStateManager();
      await this.redisManager.initializeEmptyState();

      // Initialize MongoDB
      this.snapshotManager = new SnapshotManager();
      await this.snapshotManager.connect();

      // Start periodic snapshots
      this.snapshotManager.startPeriodicSnapshots(
        () => this.redisManager.getCompleteState()
      );

      // Initialize Kafka consumer
      this.kafkaConsumer = new KafkaConsumerManager(
        this.redisManager,
        this.snapshotManager
      );

      // Start Kafka consumer (non-blocking)
      this.kafkaConsumer.start().catch((error) => {
        logger.error('Kafka consumer error:', error);
      });

      // Initialize and start State Publisher
      this.statePublisher = new StatePublisher(this.redisManager);
      await this.statePublisher.start();

      // Start API server
      this.apiServer = new ApiServer(this.redisManager, this.snapshotManager);
      await this.apiServer.start();

      // Create HTTP server for WebSocket
      const wsPort = parseInt(process.env.WEBSOCKET_PORT || '3001');
      this.httpServer = http.createServer();
      
      // Initialize WebSocket handler
      this.wsHandler = new WebSocketHandler(this.httpServer, this.redisManager);

      // Start WebSocket server
      this.httpServer.listen(wsPort, () => {
        logger.info(`WebSocket server listening on port ${wsPort}`);
      });

      logger.info('Digital Twin State Manager Service started successfully');

      // Setup graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start service:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      try {
        // Stop accepting new connections
        if (this.wsHandler) {
          this.wsHandler.stop();
        }

        if (this.httpServer) {
          this.httpServer.close();
        }

        if (this.apiServer) {
          await this.apiServer.stop();
        }

        // Stop Kafka consumer
        if (this.kafkaConsumer) {
          await this.kafkaConsumer.stop();
        }

        // Stop State Publisher
        if (this.statePublisher) {
          await this.statePublisher.stop();
        }

        // Save final snapshot
        if (this.snapshotManager && this.redisManager) {
          const finalState = await this.redisManager.getCompleteState();
          await this.snapshotManager.saveSnapshot(finalState);
        }

        // Close database connections
        if (this.snapshotManager) {
          await this.snapshotManager.close();
        }

        if (this.redisManager) {
          await this.redisManager.close();
        }

        logger.info('Shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

// Start the service
const service = new StateManagerService();
service.start();
