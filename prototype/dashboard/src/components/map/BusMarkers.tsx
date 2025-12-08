import { Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import type { Bus } from '../../types';
import { createLucideIcon } from '../../utils/leafletIcon';

interface BusMarkersProps {
  buses: Bus[];
}

// Create icons based on bus status
const createBusIcon = (status: string) => {
  const colors: Record<string, string> = {
    operational: '#10b981',
    active: '#10b981',
    inactive: '#6b7280',
    maintenance: '#f97316',
  };
  
  const backgroundColor = colors[status.toLowerCase()] || '#3b82f6';
  
  return createLucideIcon('bus', { backgroundColor });
};

export function BusMarkers({ buses }: BusMarkersProps) {
  return (
    <MarkerClusterGroup>
      {buses.map((bus) => (
        <Marker
          key={bus.busId}
          position={[bus.location.latitude, bus.location.longitude]}
          icon={createBusIcon(bus.status)}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold text-sm mb-1">
                🚌 Bus {bus.busId}
              </h3>
              <p className="text-xs text-gray-600 mb-1">
                <strong>Route:</strong> {bus.route}
              </p>
              <p className="text-xs text-gray-600 mb-1">
                <strong>Status:</strong>{' '}
                <span
                  className={`
                    px-2 py-0.5 rounded-full text-xs font-medium
                    ${
                      bus.status === 'operational' || bus.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : bus.status === 'maintenance'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-gray-100 text-gray-800'
                    }
                  `}
                >
                  {bus.status}
                </span>
              </p>
              <p className="text-xs text-gray-600 mb-1">
                <strong>Speed:</strong> {bus.speed} km/h
              </p>
              <p className="text-xs text-gray-600 mb-1">
                <strong>Occupancy:</strong> {bus.occupancy.current}/{bus.occupancy.capacity} ({Math.round((bus.occupancy.current / bus.occupancy.capacity) * 100)}%)
              </p>
              <p className="text-xs text-gray-600 mb-1">
                <strong>Current Stop:</strong> {bus.location.currentStop}
              </p>
              <p className="text-xs text-gray-600 mb-1">
                <strong>Next Stop:</strong> {bus.nextStop}
              </p>
              <p className="text-xs text-gray-600">
                <strong>ETA:</strong> {new Date(bus.estimatedArrival).toLocaleTimeString()}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  );
}
