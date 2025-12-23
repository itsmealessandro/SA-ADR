import L from 'leaflet';
import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import type { CameraSensorReading, Sensor, SpeedSensorReading } from '../../types';
import { SensorStatus } from '../../types';
import { createLucideIcon } from '../../utils/leafletIcon';

interface SensorMarkersProps {
  sensors: Sensor[];
}

// Cache icons by type and status
const iconCache = new Map<string, L.DivIcon>();

const getSensorIcon = (type: string, status: string) => {
  const key = `${type}-${status}`;
  if (!iconCache.has(key)) {
    iconCache.set(key, createSensorIcon(type, status));
  }
  return iconCache.get(key)!;
};

// Create icons based on sensor type and status
const createSensorIcon = (type: string, status: string) => {
  // Color based on status
  const statusColors: Record<string, string> = {
    [SensorStatus.ACTIVE]: '#10b981',
    [SensorStatus.INACTIVE]: '#6b7280',
    [SensorStatus.ERROR]: '#ef4444',
    [SensorStatus.DEGRADED]: '#f97316',
  };
  
  // Icon based on sensor type
  const typeIcons: Record<string, string> = {
    speed: 'gauge',
    camera: 'video',
    traffic: 'traffic-cone',
    environmental: 'wind',
  };
  
  const backgroundColor = statusColors[status] || '#3b82f6';
  const iconName = typeIcons[type] || 'radio';
  
  return createLucideIcon(iconName, { backgroundColor });
};

// Get road condition color
const getRoadConditionColor = (condition: string): string => {
  const colors: Record<string, string> = {
    clear: '#10b981',      // green
    congestion: '#f97316', // orange
    accident: '#ef4444',   // red
    obstacles: '#eab308',  // yellow
    flooding: '#3b82f6',   // blue
  };
  return colors[condition] || '#6b7280';
};

// Format speed sensor readings
const formatSpeedReadings = (readings: SpeedSensorReading[]) => (
  <div className="mt-1 text-xs">
    <strong>Individual Sensors:</strong>
    <ul className="ml-2 mt-1">
      {readings.slice(0, 3).map((r) => (
        <li key={r.sensor_id}>
          {r.sensor_id}: {r.speed_kmh.toFixed(1)} km/h
        </li>
      ))}
      {readings.length > 3 && <li>...and {readings.length - 3} more</li>}
    </ul>
  </div>
);

// Format camera sensor readings
const formatCameraReadings = (readings: CameraSensorReading[]) => (
  <div className="mt-1 text-xs">
    <strong>Camera Detections:</strong>
    <ul className="ml-2 mt-1">
      {readings.slice(0, 3).map((r) => (
        <li key={r.sensor_id}>
          {r.sensor_id}: {r.road_condition} ({(r.confidence * 100).toFixed(0)}%)
        </li>
      ))}
      {readings.length > 3 && <li>...and {readings.length - 3} more</li>}
    </ul>
  </div>
);

const SensorMarker = React.memo(
  ({ sensor }: { sensor: Sensor }) => (
        <Marker
          key={sensor.sensorId}
          position={[sensor.location!.latitude, sensor.location!.longitude]}
          icon={getSensorIcon(sensor.type, sensor.status)}
        >
          <Popup>
            <div className="p-2 min-w-[200px]">
              <h3 className="font-semibold text-sm mb-1 capitalize">
                {sensor.type === 'speed' && '🚗 Speed Sensor'}
                {sensor.type === 'camera' && '📹 Camera Analytics'}
                {sensor.type !== 'speed' && sensor.type !== 'camera' && `📡 ${sensor.type}`}
              </h3>
              
              <p className="text-xs text-gray-600 mb-1">
                <strong>ID:</strong> {sensor.sensorId}
              </p>
              
              {sensor.edgeId && (
                <p className="text-xs text-gray-600 mb-1">
                  <strong>Edge:</strong> {sensor.edgeId}
                </p>
              )}
              
              <p className="text-xs text-gray-600 mb-1">
                <strong>Value:</strong> {sensor.value.toFixed(1)} {sensor.unit}
              </p>
              
              <p className="text-xs text-gray-600 mb-1">
                <strong>Status:</strong>{' '}
                <span
                  className={`
                    px-2 py-0.5 rounded-full text-xs font-medium
                    ${
                      sensor.status === SensorStatus.ACTIVE
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }
                  `}
                >
                  {sensor.status}
                </span>
              </p>
              
              {/* Speed sensor specific metadata */}
              {sensor.type === 'speed' && sensor.metadata && (
                <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                  <p><strong>Avg Speed:</strong> {sensor.metadata.avgSpeed?.toFixed(1)} km/h</p>
                  <p><strong>Sensors:</strong> {sensor.metadata.sensorCount}</p>
                  {sensor.metadata.readings && (
                    formatSpeedReadings(sensor.metadata.readings as SpeedSensorReading[])
                  )}
                </div>
              )}
              
              {/* Camera sensor specific metadata */}
              {sensor.type === 'camera' && sensor.metadata && (
                <div className="mt-2 p-2 bg-purple-50 rounded text-xs">
                  <p>
                    <strong>Road Condition:</strong>{' '}
                    <span style={{ color: getRoadConditionColor(sensor.metadata.roadCondition || '') }}>
                      {sensor.metadata.roadCondition}
                    </span>
                  </p>
                  <p><strong>Confidence:</strong> {((sensor.metadata.confidence || 0) * 100).toFixed(0)}%</p>
                  <p><strong>Vehicles:</strong> {sensor.metadata.vehicleCount}</p>
                  <p><strong>Congestion:</strong> {sensor.metadata.congestionStatus}</p>
                  {sensor.metadata.readings && (
                    formatCameraReadings(sensor.metadata.readings as CameraSensorReading[])
                  )}
                </div>
              )}
              
              <p className="text-xs text-gray-500 mt-2">
                <strong>Updated:</strong> {new Date(sensor.lastUpdated).toLocaleString()}
              </p>
            </div>
          </Popup>
        </Marker>
  ),
  (prev, next) => 
    prev.sensor.sensorId === next.sensor.sensorId &&
    prev.sensor.status === next.sensor.status &&
    prev.sensor.value === next.sensor.value
);

export const SensorMarkers = React.memo(function SensorMarkers({ sensors }: SensorMarkersProps) {
  console.log(sensors.filter((sensor) => sensor.value === undefined))
  return (
    <MarkerClusterGroup>
      {sensors.map((sensor) => (
        <SensorMarker key={sensor.sensorId} sensor={sensor} />
      ))}
    </MarkerClusterGroup>
  );
});
