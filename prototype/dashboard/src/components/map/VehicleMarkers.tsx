import React from 'react';
import { Marker, Polyline, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import type { Vehicle } from '../../types';
import { RoutePriority } from '../../types';
import { createLucideIcon } from '../../utils/leafletIcon';

interface VehicleMarkersProps {
  vehicles: Vehicle[];
  visibleTypes?: string[];
}

// Get vehicle icon based on type
const getVehicleIconName = (type: string): string => {
  const icons: Record<string, string> = {
    ambulance: 'ambulance',
    fire_truck: 'fire-truck',
    police: 'police',
    bus: 'bus',
    truck: 'truck',
    car: 'car',
    motorcycle: 'motorcycle',
    emergency: 'siren',
  };
  return icons[type.toLowerCase()] || 'car';
};

// Get vehicle color based on type and priority
const getVehicleColor = (type: string, priority?: string): string => {
  // Emergency vehicles
  if (priority === RoutePriority.EMERGENCY || type === 'ambulance' || type === 'emergency') {
    return '#ef4444'; // red
  }
  if (type === 'fire_truck') {
    return '#f97316'; // orange
  }
  if (type === 'police') {
    return '#3b82f6'; // blue
  }
  
  // Regular vehicles by priority
  if (priority === RoutePriority.HIGH) {
    return '#f59e0b'; // amber
  }
  
  // Default by type
  const colors: Record<string, string> = {
    bus: '#10b981',      // green
    truck: '#8b5cf6',    // purple
    car: '#6b7280',      // gray
    motorcycle: '#ec4899', // pink
  };
  return colors[type.toLowerCase()] || '#6b7280';
};

// Create vehicle icon
const createVehicleIcon = (type: string, priority?: string) => {
  const iconName = getVehicleIconName(type);
  const backgroundColor = getVehicleColor(type, priority);
  
  return createLucideIcon(iconName, { 
    backgroundColor,
    size: type === 'ambulance' || type === 'fire_truck' || type === 'police' ? 36 : 28
  });
};

// Get priority badge color
const getPriorityBadgeClass = (priority: string): string => {
  switch (priority) {
    case RoutePriority.EMERGENCY:
      return 'bg-red-100 text-red-800';
    case RoutePriority.HIGH:
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const VehicleMarkers = React.memo(function VehicleMarkers({ 
  vehicles, 
  visibleTypes 
}: VehicleMarkersProps) {
  // Filter vehicles by type if specified
  const filteredVehicles = visibleTypes && visibleTypes.length > 0
    ? vehicles.filter(v => visibleTypes.includes(v.type))
    : vehicles;

  return (
    <MarkerClusterGroup>
      {filteredVehicles.map((vehicle) => (
        <React.Fragment key={vehicle.vehicleId}>
          <Marker
            position={[vehicle.gpsPosition.latitude, vehicle.gpsPosition.longitude]}
            icon={createVehicleIcon(vehicle.type, vehicle.routePlanning?.routePriority)}
          >
            <Popup>
              <div className="p-2 min-w-[220px]">
                <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
                  {vehicle.type === 'ambulance' && '🚑'}
                  {vehicle.type === 'fire_truck' && '🚒'}
                  {vehicle.type === 'police' && '🚓'}
                  {vehicle.type === 'bus' && '🚌'}
                  {vehicle.type === 'car' && '🚗'}
                  {vehicle.type === 'truck' && '🚚'}
                  {vehicle.type === 'motorcycle' && '🏍️'}
                  {!['ambulance', 'fire_truck', 'police', 'bus', 'car', 'truck', 'motorcycle'].includes(vehicle.type) && '🚗'}
                  <span className="capitalize">{vehicle.type.replace('_', ' ')}</span>
                </h3>
                
                <p className="text-xs text-gray-600 mb-1">
                  <strong>ID:</strong> {vehicle.vehicleId}
                </p>
                
                <p className="text-xs text-gray-600 mb-1">
                  <strong>Speed:</strong> {vehicle.movement.speedKmh.toFixed(1)} km/h
                </p>
                
                <p className="text-xs text-gray-600 mb-1">
                  <strong>Heading:</strong> {vehicle.movement.heading} ({vehicle.movement.directionDegrees}°)
                </p>
                
                {vehicle.routePlanning?.routePriority && (
                  <p className="text-xs text-gray-600 mb-1">
                    <strong>Priority:</strong>{' '}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityBadgeClass(vehicle.routePlanning.routePriority)}`}>
                      {vehicle.routePlanning.routePriority}
                    </span>
                  </p>
                )}
                
                {vehicle.routePlanning?.currentDestination && (
                  <p className="text-xs text-gray-600 mb-1">
                    <strong>Destination:</strong> {vehicle.routePlanning.currentDestination.locationName}
                  </p>
                )}
                
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                  <p><strong>Battery:</strong> {vehicle.managedResources.batteryLevelPercent}%</p>
                  <p><strong>Firmware:</strong> {vehicle.managedResources.firmwareVersion}</p>
                  {vehicle.sensors?.accelerometer && (
                    <p>
                      <strong>Incident:</strong>{' '}
                      <span className={vehicle.sensors.accelerometer.incidentDetected ? 'text-red-600 font-bold' : 'text-green-600'}>
                        {vehicle.sensors.accelerometer.incidentDetected ? 'DETECTED!' : 'None'}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
          
          {/* Draw route line for emergency vehicles */}
          {vehicle.routePlanning?.routePriority === RoutePriority.EMERGENCY && 
           vehicle.routePlanning?.currentDestination && (
            <Polyline
              positions={[
                [vehicle.gpsPosition.latitude, vehicle.gpsPosition.longitude],
                [vehicle.routePlanning.currentDestination.latitude, vehicle.routePlanning.currentDestination.longitude]
              ]}
              color="#ef4444"
              weight={3}
              opacity={0.7}
              dashArray="10, 10"
            />
          )}
        </React.Fragment>
      ))}
    </MarkerClusterGroup>
  );
});
