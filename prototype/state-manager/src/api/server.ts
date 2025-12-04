import cors from 'cors';
import express from 'express';
import { RedisStateManager } from '../state/redis-manager';
import { SnapshotManager } from '../state/snapshot-manager';
import { logger } from '../utils/logger';
import { createRoutes } from './routes';

export class ApiServer {
  private app: express.Application;
  private port: number;
  private server: any;

  constructor(
    redisManager: RedisStateManager,
    snapshotManager: SnapshotManager
  ) {
    this.app = express();
    this.port = parseInt(process.env.API_PORT || '3000');

    // Middleware
    this.app.use(cors());
    this.app.use(express.json());

    // Request logging
    this.app.use((req, _res, next) => {
      logger.debug(`${req.method} ${req.path}`);
      next();
    });

    // Routes
    const routes = createRoutes(redisManager, snapshotManager);
    this.app.use('/', routes);

    // 404 handler
    this.app.use((_req, res) => {
      res.status(404).json({ error: 'Not found' });
    });

    // Error handler
    this.app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error('Unhandled error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  /**
   * Start the API server
   */
  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        logger.info(`API server listening on port ${this.port}`);
        resolve();
      });
    });
  }

  /**
   * Stop the API server
   */
  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err: any) => {
          if (err) {
            logger.error('Error stopping API server:', err);
            reject(err);
          } else {
            logger.info('API server stopped');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}
