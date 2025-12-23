import express, { Request, Response } from 'express';
import { RedisStateManager } from '../state/redis-manager';
import { SnapshotManager } from '../state/snapshot-manager';
import { logger } from '../utils/logger';

export function createRoutes(
  redisManager: RedisStateManager,
  snapshotManager: SnapshotManager
) {
  const router = express.Router();

  /**
   * GET /health - Health check endpoint
   */
  router.get('/health', async (_req: Request, res: Response) => {
    try {
      const redisConnected = await redisManager.isConnected();
      const mongoConnected = await snapshotManager.isConnected();

      const healthy = redisConnected && mongoConnected;
      const status = healthy ? 200 : 503;

      res.status(status).json({
        status: healthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          redis: redisConnected ? 'connected' : 'disconnected',
          mongodb: mongoConnected ? 'connected' : 'disconnected',
        },
      });
    } catch (error) {
      logger.error('Health check error:', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      });
    }
  });

  /**
   * GET /state - Get complete city state
   */
  router.get('/state', async (_req: Request, res: Response) => {
    try {
      const state = await redisManager.getCompleteState();
      res.json(state);
    } catch (error) {
      logger.error('Error retrieving complete state:', error);
      res.status(500).json({ error: 'Failed to retrieve state' });
    }
  });

  /**
   * GET /state/districts - Get all districts
   */
  router.get('/state/districts', async (_req: Request, res: Response) => {
    try {
      const districts = await redisManager.getAllDistricts();
      res.json(districts);
    } catch (error) {
      logger.error('Error retrieving districts:', error);
      res.status(500).json({ error: 'Failed to retrieve districts' });
    }
  });

  /**
   * GET /state/districts/:districtId - Get specific district state
   */
  router.get('/state/districts/:districtId', async (req: Request, res: Response) => {
    try {
      const { districtId } = req.params;
      const district = await redisManager.getDistrictState(districtId);

      if (!district) {
        res.status(404).json({ error: 'District not found' });
        return;
      }

      res.json(district);
    } catch (error) {
      logger.error('Error retrieving district:', error);
      res.status(500).json({ error: 'Failed to retrieve district' });
    }
  });

  /**
   * GET /state/districts/:districtId/sensors - Get district sensors
   */
  router.get('/state/districts/:districtId/sensors', async (req: Request, res: Response) => {
    try {
      const { districtId } = req.params;
      const district = await redisManager.getDistrictState(districtId);

      if (!district) {
        res.status(404).json({ error: 'District not found' });
        return;
      }

      res.json(district.sensors);
    } catch (error) {
      logger.error('Error retrieving district sensors:', error);
      res.status(500).json({ error: 'Failed to retrieve district sensors' });
    }
  });

  /**
   * GET /state/districts/:districtId/buildings - Get district buildings
   */
  router.get('/state/districts/:districtId/buildings', async (req: Request, res: Response) => {
    try {
      const { districtId } = req.params;
      const district = await redisManager.getDistrictState(districtId);

      if (!district) {
        res.status(404).json({ error: 'District not found' });
        return;
      }

      res.json(district.buildings);
    } catch (error) {
      logger.error('Error retrieving district buildings:', error);
      res.status(500).json({ error: 'Failed to retrieve district buildings' });
    }
  });

  /**
   * GET /state/districts/:districtId/weather - Get district weather stations
   */
  router.get('/state/districts/:districtId/weather', async (req: Request, res: Response) => {
    try {
      const { districtId } = req.params;
      const district = await redisManager.getDistrictState(districtId);

      if (!district) {
        res.status(404).json({ error: 'District not found' });
        return;
      }

      res.json(district.weatherStations);
    } catch (error) {
      logger.error('Error retrieving district weather:', error);
      res.status(500).json({ error: 'Failed to retrieve district weather' });
    }
  });

  /**
   * GET /state/vehicles - Get all vehicles data
   */
  router.get('/state/vehicles', async (_req: Request, res: Response) => {
    try {
      const vehicles = await redisManager.getVehicles();
      res.json(vehicles || []);
    } catch (error) {
      logger.error('Error retrieving vehicles:', error);
      res.status(500).json({ error: 'Failed to retrieve vehicles' });
    }
  });

  /**
   * GET /state/graph - Get city-wide traffic graph
   */
  router.get('/state/graph', async (_req: Request, res: Response) => {
    try {
      const cityGraph = await redisManager.getCityGraph();
      res.json(cityGraph || { nodes: [], edges: [] });
    } catch (error) {
      logger.error('Error retrieving city graph:', error);
      res.status(500).json({ error: 'Failed to retrieve city graph' });
    }
  });

  /**
   * GET /snapshots/latest - Get the latest snapshot
   */
  router.get('/snapshots/latest', async (_req: Request, res: Response) => {
    try {
      const snapshot = await snapshotManager.getLatestSnapshot();
      
      if (!snapshot) {
        res.status(404).json({ error: 'No snapshots available' });
        return;
      }

      res.json({ snapshot });
    } catch (error) {
      logger.error('Error retrieving latest snapshot:', error);
      res.status(500).json({ error: 'Failed to retrieve latest snapshot' });
    }
  });

  /**
   * GET /snapshots/:id - Get a specific snapshot by ID
   */
  router.get('/snapshots/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const snapshot = await snapshotManager.getSnapshot(id);
      
      if (!snapshot) {
        res.status(404).json({ error: 'Snapshot not found' });
        return;
      }

      res.json({ snapshot });
    } catch (error) {
      logger.error('Error retrieving snapshot:', error);
      res.status(500).json({ error: 'Failed to retrieve snapshot' });
    }
  });

  return router;
}
