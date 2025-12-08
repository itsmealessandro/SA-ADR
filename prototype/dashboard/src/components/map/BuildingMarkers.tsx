import { Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import type { Building } from '../../types';
import { createLucideIcon } from '../../utils/leafletIcon';

interface BuildingMarkersProps {
  buildings: Building[];
}

export function BuildingMarkers({ buildings }: BuildingMarkersProps) {
  return (
    <MarkerClusterGroup>
      {buildings.map((building) => {
        const occupancyRate = building.occupancyRate;
        const color = occupancyRate > 0.8 ? '#F44336' : occupancyRate > 0.5 ? '#FFC107' : '#4CAF50';

        return (
          <Marker
            key={building.buildingId}
            position={[building.location.latitude, building.location.longitude]}
            icon={createLucideIcon('building', { backgroundColor: color })}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-sm mb-1">
                  🏢 {building.name}
                </h3>
                <p className="text-xs text-gray-600 mb-1">
                  <strong>Type:</strong> {building.type}
                </p>
                <p className="text-xs text-gray-600 mb-1">
                  <strong>Address:</strong> {building.location.address}
                </p>
                <p className="text-xs text-gray-600 mb-1">
                  <strong>Floors:</strong> {building.floors}
                </p>
                <p className="text-xs text-gray-600 mb-1">
                  <strong>Occupancy:</strong> {building.currentOccupancy}/{building.totalCapacity} ({(building.occupancyRate * 100).toFixed(1)}%)
                </p>
                <p className="text-xs text-gray-600 mb-1">
                  <strong>Status:</strong>{' '}
                  <span
                    className={`
                      px-2 py-0.5 rounded-full text-xs font-medium
                      ${
                        building.status === 'operational'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }
                    `}
                  >
                    {building.status}
                  </span>
                </p>
                {building.sensors && building.sensors.length > 0 && (
                  <p className="text-xs text-gray-600">
                    <strong>Sensors:</strong> {building.sensors.length}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MarkerClusterGroup>
  );
}
