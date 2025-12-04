import { Server as HttpServer } from 'http';
import * as jsondiffpatch from 'jsondiffpatch';
import { Socket, Server as SocketIOServer } from 'socket.io';
import { RedisStateManager } from '../state/redis-manager';
import { City } from '../types';
import { logger } from '../utils/logger';

export class WebSocketHandler {
  private io: SocketIOServer;
  private redisManager: RedisStateManager;
  private diffPatcher: jsondiffpatch.DiffPatcher;
  private lastStates: Map<string, City> = new Map();
  // private updateBuffer: Map<string, any> = new Map();
  private updateTimer: NodeJS.Timeout | null = null;
  private bufferInterval: number;

  constructor(httpServer: HttpServer, redisManager: RedisStateManager) {
    this.redisManager = redisManager;
    this.bufferInterval = parseInt(process.env.WS_UPDATE_BUFFER_MS || '100');

    // Initialize Socket.IO server
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    // Initialize jsondiffpatch
    this.diffPatcher = jsondiffpatch.create({
      objectHash: (obj: any) => {
        return obj.id || obj.sensorId || obj.districtId || obj.buildingId || obj.busId || obj.incidentId || JSON.stringify(obj);
      },
      arrays: {
        detectMove: true,
      },
    });

    this.setupConnectionHandlers();
    this.startUpdateBroadcaster();
  }

  /**
   * Setup WebSocket connection handlers
   */
  private setupConnectionHandlers(): void {
    this.io.on('connection', async (socket: Socket) => {
      logger.info(`WebSocket client connected: ${socket.id}`);

      try {
        // Send initial full state
        const initialState = await this.redisManager.getCompleteState();
        socket.emit('initial-state', initialState);

        // Store last state for this client
        this.lastStates.set(socket.id, initialState);

        logger.info(`Sent initial state to client: ${socket.id}`);
      } catch (error) {
        logger.error('Error sending initial state:', error);
        socket.emit('error', { message: 'Failed to retrieve initial state' });
      }

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info(`WebSocket client disconnected: ${socket.id}`);
        this.lastStates.delete(socket.id);
      });

      // Handle client requests for specific district
      socket.on('subscribe-district', async (districtId: string) => {
        logger.info(`Client ${socket.id} subscribed to district ${districtId}`);
        socket.join(`district:${districtId}`);
      });

      socket.on('unsubscribe-district', (districtId: string) => {
        logger.info(`Client ${socket.id} unsubscribed from district ${districtId}`);
        socket.leave(`district:${districtId}`);
      });
    });
  }

  /**
   * Start the update broadcaster that sends incremental diffs
   */
  private startUpdateBroadcaster(): void {
    this.updateTimer = setInterval(async () => {
      try {
        await this.broadcastStateUpdates();
      } catch (error) {
        logger.error('Error broadcasting updates:', error);
      }
    }, this.bufferInterval);

    logger.info(`WebSocket update broadcaster started (interval: ${this.bufferInterval}ms)`);
  }

  /**
   * Broadcast state updates to all connected clients
   */
  private async broadcastStateUpdates(): Promise<void> {
    if (this.lastStates.size === 0) {
      return; // No connected clients
    }

    // Get current state
    const currentState = await this.redisManager.getCompleteState();

    // Send diffs to each connected client
    this.lastStates.forEach((lastState, socketId) => {
      const socket = this.io.sockets.sockets.get(socketId);
      
      if (!socket) {
        this.lastStates.delete(socketId);
        return;
      }

      try {
        // Calculate diff between last state and current state
        const delta = this.diffPatcher.diff(lastState, currentState);

        if (delta) {
          // Send incremental update
          socket.emit('state-update', delta);
          logger.debug(`Sent incremental update to client ${socketId}`, {
            deltaSize: JSON.stringify(delta).length,
          });

          // Update last state for this client
          this.lastStates.set(socketId, JSON.parse(JSON.stringify(currentState)));
        }
      } catch (error) {
        logger.error(`Error calculating diff for client ${socketId}:`, error);
      }
    });
  }

  /**
   * Notify about specific district update
   */
  async notifyDistrictUpdate(districtId: string): Promise<void> {
    try {
      const district = await this.redisManager.getDistrictState(districtId);
      
      if (district) {
        this.io.to(`district:${districtId}`).emit('district-update', district);
        logger.debug(`Sent district update to subscribers: ${districtId}`);
      }
    } catch (error) {
      logger.error('Error notifying district update:', error);
    }
  }

  /**
   * Stop the WebSocket server
   */
  stop(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    this.io.close();
    logger.info('WebSocket server stopped');
  }

  /**
   * Get number of connected clients
   */
  getConnectedClientsCount(): number {
    return this.io.sockets.sockets.size;
  }
}
