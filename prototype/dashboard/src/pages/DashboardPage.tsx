import { useEffect, useMemo, useState } from 'react';
import { ErrorMessage, LoadingSpinner } from '../components/common';
import { Layout } from '../components/layout';
import {
    BuildingMarkers,
    BusMarkers,
    Map,
    MapControls,
    RoadSegmentLayer,
    SensorMarkers,
    WeatherStationMarkers,
    type LayerType
} from '../components/map';
import { useNotificationPolling } from '../services/useNotificationPolling';
import { webSocketService } from '../services/webSocketService';
import { useCityStateStore, useWebSocketStore } from '../stores';

export function DashboardPage() {
  const { cityState, isLoading, error, loadInitialState, applyIncrementalUpdate } =
    useCityStateStore();
  const { setConnectionState } = useWebSocketStore();

  // Start notification polling
  useNotificationPolling();

  // Load initial state on mount
  useEffect(() => {
    loadInitialState();
  }, [loadInitialState]);

  // Set up WebSocket connection
  useEffect(() => {
    // Connect to WebSocket
    webSocketService.connect();

    // Subscribe to connection state changes
    const unsubscribeConnectionState = webSocketService.onConnectionStateChange(
      (state, error) => {
        setConnectionState(state, error);
      }
    );

    // Subscribe to incremental state updates
    const unsubscribeStateUpdate = webSocketService.onStateUpdate((update) => {
      applyIncrementalUpdate(update.patch);
    });

    // Cleanup on unmount
    return () => {
      unsubscribeConnectionState();
      unsubscribeStateUpdate();
      webSocketService.disconnect();
    };
  }, [setConnectionState, applyIncrementalUpdate]);

  // Collect all entities from districts and city
  const allSensors = cityState?.districts.flatMap((district) => district.sensors) || [];
  const allBuildings = cityState?.districts.flatMap((district) => district.buildings) || [];
  const allWeatherStations = cityState?.districts.flatMap((district) => district.weatherStations) || [];
  const allRoadSegments = cityState?.cityGraph.edges || [];
  const allBuses = cityState?.publicTransport.buses || [];

  // Map controls state
  const [visibleLayers, setVisibleLayers] = useState<Record<LayerType, boolean>>({
    roads: true,
    buildings: true,
    sensors: true,
    weather: true,
    buses: true,
  });

  const [sensorFilters, setSensorFilters] = useState<string[]>([]);

  const handleToggleLayer = (layer: LayerType) => {
    setVisibleLayers((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  };

  const handleToggleSensorFilter = (type: string) => {
    setSensorFilters((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  // Derive available sensor types
  const availableSensorTypes = useMemo(() => {
    const types = new Set(allSensors.map((s) => s.type));
    return Array.from(types).sort();
  }, [allSensors]);

  // Filter sensors based on active filters
  const filteredSensors = useMemo(() => {
    if (sensorFilters.length === 0) return allSensors;
    return allSensors.filter((s) => !sensorFilters.includes(s.type));
  }, [allSensors, sensorFilters]);

  return (
    <Layout>
      <div className="w-full h-full relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <LoadingSpinner size="lg" message="Loading city state..." />
          </div>
        )}

        {error && !cityState && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <ErrorMessage
              message={error.message || 'Failed to load city state'}
              onRetry={loadInitialState}
            />
          </div>
        )}

        {cityState && (
          <Map>
            <MapControls 
              visibleLayers={visibleLayers}
              onToggleLayer={handleToggleLayer}
              sensorFilters={sensorFilters}
              availableSensorTypes={availableSensorTypes}
              onToggleSensorFilter={handleToggleSensorFilter}
            />

            {/* Road segments as base layer */}
            {visibleLayers.roads && (
              <RoadSegmentLayer edges={allRoadSegments} />
            )}
            
            {/* Building markers */}
            {visibleLayers.buildings && (
              <BuildingMarkers buildings={allBuildings} />
            )}
            
            {/* Sensor markers */}
            {visibleLayers.sensors && (
              <SensorMarkers sensors={filteredSensors} />
            )}
            
            {/* Weather station markers */}
            {visibleLayers.weather && (
              <WeatherStationMarkers stations={allWeatherStations} />
            )}
            
            {/* Bus markers */}
            {visibleLayers.buses && (
              <BusMarkers buses={allBuses} />
            )}
          </Map>
        )}
      </div>
    </Layout>
  );
}
