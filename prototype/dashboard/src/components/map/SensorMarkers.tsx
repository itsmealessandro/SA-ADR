import { Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import type { Sensor } from '../../types';
import { createLucideIcon } from '../../utils/leafletIcon';

interface SensorMarkersProps {
  sensors: Sensor[];
}

// Create icons based on status
const createSensorIcon = (status: string) => {
  const colors: Record<string, string> = {
    active: '#10b981',
    inactive: '#6b7280',
    error: '#ef4444',
    degraded: '#f97316',
  };
  
  const backgroundColor = colors[status] || '#3b82f6';
  
  return createLucideIcon('radio', { backgroundColor });
};

export function SensorMarkers({ sensors }: SensorMarkersProps) {
  return (
    <MarkerClusterGroup>
      {sensors.filter(s => s.location).map((sensor) => (
        <Marker
          key={sensor.sensorId}
          position={[sensor.location!.latitude, sensor.location!.longitude]}
          icon={createSensorIcon(sensor.status)}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold text-sm mb-1">
                {sensor.type}
              </h3>
              <p className="text-xs text-gray-600 mb-1">
                <strong>ID:</strong> {sensor.sensorId}
              </p>
              <p className="text-xs text-gray-600 mb-1">
                <strong>Value:</strong> {sensor.value} {sensor.unit}
              </p>
              <p className="text-xs text-gray-600 mb-1">
                <strong>Status:</strong>{' '}
                <span
                  className={`
                    px-2 py-0.5 rounded-full text-xs font-medium
                    ${
                      sensor.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }
                  `}
                >
                  {sensor.status}
                </span>
              </p>
              {sensor.metadata && (
                <p className="text-xs text-gray-600 mb-1">
                  <strong>Congestion:</strong> {sensor.metadata.congestionStatus}<br />
                  <strong>Avg Speed:</strong> {sensor.metadata.avgSpeed} km/h<br />
                  <strong>Vehicles:</strong> {sensor.metadata.vehicleCount}
                </p>
              )}
              <p className="text-xs text-gray-600">
                <strong>Updated:</strong> {new Date(sensor.lastUpdated).toLocaleString()}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  );
}
