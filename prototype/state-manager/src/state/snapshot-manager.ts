import { Collection, Db, MongoClient, ObjectId } from 'mongodb';
import { City } from '../types';
import { logger } from '../utils/logger';

export class SnapshotManager {
  private client: MongoClient;
  private db: Db | null = null;
  private collection: Collection | null = null;
  private snapshotInterval: NodeJS.Timeout | null = null;
  private changeCounter = 0;

  constructor() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    this.client = new MongoClient(uri);
  }

  /**
   * Connect to MongoDB
   */
  async connect(): Promise<void> {
    try {
      await this.client.connect();
      const dbName = process.env.MONGODB_DATABASE || 'digital_twin';
      this.db = this.client.db(dbName);
      this.collection = this.db.collection('state_snapshots');

      // Create index on timestamp
      await this.collection.createIndex({ timestamp: -1 });

      logger.info('Connected to MongoDB');
    } catch (error) {
      logger.error('MongoDB connection error:', error);
      throw error;
    }
  }

  /**
   * Save a snapshot of the current state
   */
  async saveSnapshot(state: City): Promise<void> {
    if (!this.collection) {
      logger.error('MongoDB collection not initialized');
      return;
    }

    try {
      const snapshot = {
        ...state,
        snapshotTimestamp: new Date(),
      };

      await this.collection.insertOne(snapshot as any);
      logger.info('Snapshot saved successfully', { timestamp: snapshot.snapshotTimestamp });

      // Reset change counter
      this.changeCounter = 0;
    } catch (error) {
      logger.error('Error saving snapshot:', error);
    }
  }

  /**
   * Get the latest snapshot
   */
  async getLatestSnapshot(): Promise<City | null> {
    if (!this.collection) {
      logger.error('MongoDB collection not initialized');
      return null;
    }

    try {
      const snapshot = await this.collection
        .findOne({}, { sort: { snapshotTimestamp: -1 } });

      if (!snapshot) {
        return null;
      }

      // Remove MongoDB _id field
      const { _id, snapshotTimestamp, ...state } = snapshot;
      return state as any as City;
    } catch (error) {
      logger.error('Error retrieving latest snapshot:', error);
      return null;
    }
  }

  /**
   * Get a specific snapshot by ID
   */
  async getSnapshot(id: string): Promise<City | null> {
    if (!this.collection) {
      logger.error('MongoDB collection not initialized');
      return null;
    }

    try {
      const snapshot = await this.collection.findOne({ _id: new ObjectId(id) });

      if (!snapshot) {
        return null;
      }

      // Remove MongoDB _id field
      const { _id, snapshotTimestamp, ...state } = snapshot;
      return state as any as City;
    } catch (error) {
      logger.error('Error retrieving snapshot by ID:', error);
      return null;
    }
  }

  /**
   * Get snapshot by timestamp
   */
  async getSnapshotByTimestamp(timestamp: Date): Promise<City | null> {
    if (!this.collection) {
      logger.error('MongoDB collection not initialized');
      return null;
    }

    try {
      const snapshot = await this.collection.findOne({
        snapshotTimestamp: { $lte: timestamp },
      }, { sort: { snapshotTimestamp: -1 } });

      if (!snapshot) {
        return null;
      }

      const { _id, snapshotTimestamp, ...state } = snapshot;
      return state as any as City;
    } catch (error) {
      logger.error('Error retrieving snapshot by timestamp:', error);
      return null;
    }
  }

  /**
   * Start periodic snapshot saving
   */
  startPeriodicSnapshots(getStateCallback: () => Promise<City>): void {
    const intervalMs = parseInt(process.env.SNAPSHOT_INTERVAL_MS || '300000'); // Default 5 minutes

    this.snapshotInterval = setInterval(async () => {
      try {
        const state = await getStateCallback();
        await this.saveSnapshot(state);
      } catch (error) {
        logger.error('Error during periodic snapshot:', error);
      }
    }, intervalMs);

    logger.info(`Periodic snapshots started (interval: ${intervalMs}ms)`);
  }

  /**
   * Stop periodic snapshots
   */
  stopPeriodicSnapshots(): void {
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
      logger.info('Periodic snapshots stopped');
    }
  }

  /**
   * Increment change counter and trigger snapshot if threshold reached
   */
  async incrementChangeCounter(
    getStateFn: () => Promise<City>,
    changeCount: number = 1
  ): Promise<void> {
    this.changeCounter += changeCount;

    const minChanges = parseInt(process.env.SNAPSHOT_MIN_CHANGES || '100');

    if (this.changeCounter >= minChanges) {
      const state = await getStateFn();
      await this.saveSnapshot(state);
    }
  }
  /**
   * Check if MongoDB is connected
   */
  async isConnected(): Promise<boolean> {
    try {
      if (!this.db) return false;
      await this.db.admin().ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Close MongoDB connection
   */
  async close(): Promise<void> {
    this.stopPeriodicSnapshots();
    await this.client.close();
    logger.info('MongoDB connection closed');
  }
}
