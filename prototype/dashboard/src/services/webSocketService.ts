import type { Delta } from 'jsondiffpatch';
import * as jsondiffpatch from 'jsondiffpatch';
import { io, Socket } from 'socket.io-client';
import { config } from '../config';
import type { CityState, StateUpdate, WebSocketMessage } from '../types';
import { WebSocketMessageType } from '../types';

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

type MessageHandler = (message: WebSocketMessage) => void;
type StateUpdateHandler = (update: StateUpdate) => void;
type ConnectionStateHandler = (state: ConnectionState, error?: Error) => void;

export class WebSocketService {
  private socket: Socket | null = null;
  private readonly url: string;
  private readonly diffPatcher = jsondiffpatch.create();
  
  private messageHandlers: Set<MessageHandler> = new Set();
  private stateUpdateHandlers: Set<StateUpdateHandler> = new Set();
  private connectionStateHandlers: Set<ConnectionStateHandler> = new Set();
  
  private connectionState: ConnectionState = 'disconnected';

  constructor(url?: string) {
    this.url = url || config.stateManagerWsUrl;
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): void {
    if (this.socket?.connected) {
      console.warn('Socket.IO already connected');
      return;
    }

    this.setConnectionState('connecting');
    console.log(`Connecting to Socket.IO server: ${this.url}`);

    try {
      this.socket = io(this.url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 3000,
      });
      
      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to create Socket.IO connection:', error);
      this.setConnectionState('error', error as Error);
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.setConnectionState('disconnected');
  }

  /**
   * Subscribe to raw WebSocket messages
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Subscribe to state updates (incremental patches)
   */
  onStateUpdate(handler: StateUpdateHandler): () => void {
    this.stateUpdateHandlers.add(handler);
    return () => this.stateUpdateHandlers.delete(handler);
  }

  /**
   * Subscribe to connection state changes
   */
  onConnectionStateChange(handler: ConnectionStateHandler): () => void {
    this.connectionStateHandlers.add(handler);
    // Immediately call with current state
    handler(this.connectionState);
    return () => this.connectionStateHandlers.delete(handler);
  }

  /**
   * Apply a jsondiffpatch patch to the current state
   */
  applyPatch(currentState: CityState, patch: unknown): CityState {
    return this.diffPatcher.patch(JSON.parse(JSON.stringify(currentState)), patch as Delta) as CityState;
  }

  /**
   * Get the current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket.IO connected');
      this.setConnectionState('connected');
    });

    this.socket.on('initial-state', (initialState: CityState) => {
      console.log('Received initial state');
      const message: WebSocketMessage = {
        type: WebSocketMessageType.FULL_STATE,
        state: initialState,
        timestamp: new Date().toISOString(),
      };
      this.messageHandlers.forEach(handler => handler(message));
    });

    this.socket.on('state-update', (delta: unknown) => {
      console.log('Received state update (delta)');
      const update: StateUpdate = {
        timestamp: new Date().toISOString(),
        patch: delta,
      };
      this.stateUpdateHandlers.forEach(handler => handler(update));
      
      // Also notify message handlers
      const message: WebSocketMessage = {
        type: WebSocketMessageType.INCREMENTAL_UPDATE,
        patch: delta,
        timestamp: new Date().toISOString(),
      };
      this.messageHandlers.forEach(handler => handler(message));
    });

    this.socket.on('district-update', (district: unknown) => {
      console.log('Received district update');
      const message: WebSocketMessage = {
        type: WebSocketMessageType.DISTRICT_UPDATE,
        data: district,
        timestamp: new Date().toISOString(),
      };
      this.messageHandlers.forEach(handler => handler(message));
    });

    this.socket.on('error', (error: unknown) => {
      console.error('Socket.IO error:', error);
      this.setConnectionState('error', error as Error);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log(`Socket.IO disconnected: ${reason}`);
      this.setConnectionState('disconnected');
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Socket.IO connection error:', error);
      this.setConnectionState('error', error);
    });
  }

  private setConnectionState(state: ConnectionState, error?: Error): void {
    this.connectionState = state;
    this.connectionStateHandlers.forEach(handler => handler(state, error));
  }
}

// Singleton instance
export const webSocketService = new WebSocketService();
