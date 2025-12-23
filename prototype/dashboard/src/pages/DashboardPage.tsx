import { useEffect, useMemo, useState } from 'react';
import { ErrorMessage, LoadingSpinner } from '../components/common';
import { Layout } from '../components/layout';
import {
  BuildingMarkers,
  GatewayMarkers,
  Map,
  MapControls,
  RoadSegmentLayer,
  SensorMarkers,
  VehicleMarkers,
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

  // Collect all entities from districts and city - memoized to prevent unnecessary re-renders
  const allSensors = useMemo(
    () => cityState?.districts.flatMap((district) => district.sensors) || [],
    [cityState?.districts]
  );
  
  const allBuildings = useMemo(
    () => cityState?.districts.flatMap((district) => district.buildings) || [],
    [cityState?.districts]
  );
  
  const allWeatherStations = useMemo(
    () => cityState?.districts.flatMap((district) => district.weatherStations) || [],
    [cityState?.districts]
  );
  
  const allGateways = useMemo(
    () => cityState?.districts.flatMap((district) => district.gateways) || [],
    [cityState?.districts]
  );
  
  const allRoadSegments = useMemo(
    () => cityState?.cityGraph.edges || [],
    [cityState?.cityGraph.edges]
  );

  // Get vehicles directly from city state
  const allVehicles = useMemo(
    () => cityState?.vehicles || [],
    [cityState?.vehicles]
  );

  // Map controls state
  const [visibleLayers, setVisibleLayers] = useState<Record<LayerType, boolean>>({
    roads: true,
    buildings: true,
    sensors: true,
    weather: false, // Default off - too many markers
    vehicles: true,
    gateways: false, // Default off
  });

  const [sensorFilters, setSensorFilters] = useState<string[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
  const [vehicleTypeFilters, setVehicleTypeFilters] = useState<string[]>([]);

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

  const handleSelectGateway = (gatewayId: string | null) => {
    setSelectedGateway(gatewayId);
  };

  const handleToggleVehicleTypeFilter = (type: string) => {
    setVehicleTypeFilters((prev) =>
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

  // Derive available gateways
  const availableGateways = useMemo(() => {
    const gateways = new Set(allSensors.map((s) => s.gatewayId).filter(Boolean));
    return Array.from(gateways).sort() as string[];
  }, [allSensors]);

  // Derive available vehicle types
  const availableVehicleTypes = useMemo(() => {
    const types = new Set(allVehicles.map((v) => v.type));
    return Array.from(types).sort();
  }, [allVehicles]);

  // Filter sensors based on active filters and selected gateway
  const filteredSensors = useMemo(() => {
    let filtered = allSensors;
    
    // Filter by gateway
    if (selectedGateway) {
      filtered = filtered.filter((s) => s.gatewayId === selectedGateway);
    }
    
    // Filter by sensor type
    if (sensorFilters.length > 0) {
      filtered = filtered.filter((s) => !sensorFilters.includes(s.type));
    }
    
    return filtered;
  }, [allSensors, selectedGateway, sensorFilters]);

  // Filter weather stations by gateway (if selected)
  const filteredWeatherStations = useMemo(() => {
    if (!selectedGateway) return allWeatherStations;
    return allWeatherStations.filter((s) => s.gatewayId === selectedGateway);
  }, [allWeatherStations, selectedGateway]);

  // Filter vehicles by type
  const filteredVehicles = useMemo(() => {
    if (vehicleTypeFilters.length === 0) return allVehicles;
    return allVehicles.filter((v) => !vehicleTypeFilters.includes(v.type));
  }, [allVehicles, vehicleTypeFilters]);

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
              availableGateways={availableGateways}
              selectedGateway={selectedGateway}
              onSelectGateway={handleSelectGateway}
              vehicleTypeFilters={vehicleTypeFilters}
              availableVehicleTypes={availableVehicleTypes}
              onToggleVehicleTypeFilter={handleToggleVehicleTypeFilter}
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
              <WeatherStationMarkers stations={filteredWeatherStations} />
            )}
            
            {/* Vehicle markers */}
            {visibleLayers.vehicles && (
              <VehicleMarkers vehicles={filteredVehicles} />
            )}
            
            {/* Gateway markers */}
            {visibleLayers.gateways && (
              <GatewayMarkers gateways={allGateways} />
            )}
          </Map>
        )}
      </div>
    </Layout>
  );
}
