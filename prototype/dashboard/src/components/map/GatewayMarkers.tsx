import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import type { Gateway } from '../../types';
import { createLucideIcon } from '../../utils/leafletIcon';

interface GatewayMarkersProps {
  gateways: Gateway[];
}

// Create gateway icon
const createGatewayIcon = () => {
  return createLucideIcon('gateway', { 
    backgroundColor: '#8b5cf6', // purple for gateways
    size: 32
  });
};

// Get sensor type badge color
const getSensorTypeBadgeClass = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'speed':
      return 'bg-blue-100 text-blue-800';
    case 'weather':
      return 'bg-green-100 text-green-800';
    case 'camera':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const GatewayMarkers = React.memo(function GatewayMarkers({ gateways }: GatewayMarkersProps) {
  return (
    <MarkerClusterGroup>
      {gateways.map((gateway) => {
        // Count sensors by type
        const sensorCounts = {
          speed: gateway.sensors.filter(s => s.sensorType === 'speed').length,
          weather: gateway.sensors.filter(s => s.sensorType === 'weather').length,
          camera: gateway.sensors.filter(s => s.sensorType === 'camera').length,
        };
        const totalSensors = gateway.sensors.length;

        return (
          <Marker
            key={gateway.gatewayId}
            position={[gateway.location.latitude, gateway.location.longitude]}
            icon={createGatewayIcon()}
          >
            <Popup>
              <div className="p-2 min-w-[280px] max-w-[320px]">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  🔌 {gateway.name}
                </h3>
                
                <div className="space-y-1 mb-3">
                  <div className="text-xs">
                    <span className="font-medium text-gray-600">Gateway ID:</span>{' '}
                    <span className="text-gray-800">{gateway.gatewayId}</span>
                  </div>
                  <div className="text-xs">
                    <span className="font-medium text-gray-600">Version:</span>{' '}
                    <span className="text-gray-800">{gateway.metadata.version}</span>
                  </div>
                  <div className="text-xs">
                    <span className="font-medium text-gray-600">Firmware:</span>{' '}
                    <span className="text-gray-800">{gateway.metadata.firmware}</span>
                  </div>
                  <div className="text-xs">
                    <span className="font-medium text-gray-600">Location:</span>{' '}
                    <span className="text-gray-800">
                      {gateway.location.latitude.toFixed(6)}, {gateway.location.longitude.toFixed(6)}
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="font-medium text-gray-600">Last Updated:</span>{' '}
                    <span className="text-gray-800">
                      {new Date(gateway.lastUpdated).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Sensor Type Counts */}
                <div className="mb-3 pb-2 border-t border-gray-200 pt-2">
                  <div className="text-xs font-medium text-gray-700 mb-2">
                    Managed Sensors ({totalSensors})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sensorCounts.speed > 0 && (
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getSensorTypeBadgeClass('speed')}`}>
                        Speed: {sensorCounts.speed}
                      </span>
                    )}
                    {sensorCounts.weather > 0 && (
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getSensorTypeBadgeClass('weather')}`}>
                        Weather: {sensorCounts.weather}
                      </span>
                    )}
                    {sensorCounts.camera > 0 && (
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getSensorTypeBadgeClass('camera')}`}>
                        Camera: {sensorCounts.camera}
                      </span>
                    )}
                  </div>
                </div>

                {/* Sensor List */}
                {gateway.sensors.length > 0 && (
                  <div className="border-t border-gray-200 pt-2">
                    <div className="text-xs font-medium text-gray-700 mb-2">
                      Sensor List
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {gateway.sensors.map((sensor) => (
                        <div 
                          key={sensor.sensorId} 
                          className="text-xs p-2 bg-gray-50 rounded border border-gray-100"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-800 truncate">
                                {sensor.sensorId}
                              </div>
                              <div className="text-gray-600 mt-0.5">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${getSensorTypeBadgeClass(sensor.sensorType)}`}>
                                  {sensor.sensorType}
                                </span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              {sensor.sensorType === 'speed' && sensor.speedKmh !== undefined && (
                                <div className="text-gray-800 font-medium">
                                  {sensor.speedKmh.toFixed(1)} km/h
                                </div>
                              )}
                              {sensor.sensorType === 'weather' && sensor.temperatureC !== undefined && (
                                <div className="text-gray-800 font-medium">
                                  {sensor.temperatureC.toFixed(1)}°C
                                </div>
                              )}
                              {sensor.sensorType === 'camera' && sensor.vehicleCount !== undefined && (
                                <div className="text-gray-800 font-medium">
                                  {sensor.vehicleCount} vehicles
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-gray-500 mt-1 flex items-center justify-between text-[10px]">
                            <span>Edge: {sensor.edgeId}</span>
                            <span className={`px-1 py-0.5 rounded ${
                              sensor.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {sensor.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MarkerClusterGroup>
  );
});
