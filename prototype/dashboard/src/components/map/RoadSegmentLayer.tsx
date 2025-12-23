import React from 'react';
import { Polyline, Popup } from 'react-leaflet';
import type { Edge } from '../../types';
import { CongestionLevel } from '../../types';

interface RoadSegmentLayerProps {
  edges: Edge[];
}

const getCongestionColor = (congestionLevel: string): string => {
  const colors: Record<string, string> = {
    [CongestionLevel.LOW]: '#4CAF50',      // Green
    light: '#4CAF50',                       // Alias for backwards compatibility
    [CongestionLevel.MODERATE]: '#FFC107', // Yellow/Orange
    [CongestionLevel.HIGH]: '#F44336',     // Red
    heavy: '#F44336',                       // Alias for backwards compatibility
    [CongestionLevel.SEVERE]: '#8B0000',   // Dark Red
  };
  return colors[congestionLevel.toLowerCase()] || '#9E9E9E';
};

const getCongestionWidth = (congestionLevel: string): number => {
  const widths: Record<string, number> = {
    [CongestionLevel.LOW]: 3,
    light: 3,                              // Alias for backwards compatibility
    [CongestionLevel.MODERATE]: 5,
    [CongestionLevel.HIGH]: 7,
    heavy: 7,                              // Alias for backwards compatibility
    [CongestionLevel.SEVERE]: 9,
  };
  return widths[congestionLevel.toLowerCase()] || 3;
};

export const RoadSegmentLayer = React.memo(function RoadSegmentLayer({ edges }: RoadSegmentLayerProps) {
  return (
    <>
      {edges.map((edge) => {
        const coordinates = edge.geometry.coordinates.map(
          (coord) => [coord[1], coord[0]] as [number, number] // Swap lon/lat to lat/lon for Leaflet
        );

        return (
          <Polyline
            key={edge.edgeId}
            positions={coordinates}
            pathOptions={{
              color: getCongestionColor(edge.trafficConditions.congestionLevel),
              weight: getCongestionWidth(edge.trafficConditions.congestionLevel),
              opacity: 0.8,
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-sm mb-1">
                  🛣️ {edge.name}
                </h3>
                <p className="text-xs text-gray-600 mb-1">
                  <strong>Congestion:</strong>{' '}
                  <span
                    className={`
                      px-2 py-0.5 rounded-full text-xs font-medium
                      ${
                        edge.trafficConditions.congestionLevel === CongestionLevel.LOW ||
                        edge.trafficConditions.congestionLevel === 'light'
                          ? 'bg-green-100 text-green-800'
                          : edge.trafficConditions.congestionLevel === CongestionLevel.MODERATE
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }
                    `}
                  >
                    {edge.trafficConditions.congestionLevel}
                  </span>
                </p>
                <p className="text-xs text-gray-600 mb-1">
                  <strong>Avg Speed:</strong> {edge.trafficConditions.averageSpeed} km/h (limit: {edge.speedLimit} km/h)
                </p>
                <p className="text-xs text-gray-600 mb-1">
                  <strong>Vehicles:</strong> {edge.trafficConditions.vehicleCount}
                </p>
                <p className="text-xs text-gray-600 mb-1">
                  <strong>Travel Time:</strong> {edge.trafficConditions.travelTime} min
                </p>
                <p className="text-xs text-gray-600 mb-1">
                  <strong>Distance:</strong> {edge.distance.toFixed(0)} m
                </p>
                <p className="text-xs text-gray-600 mb-1">
                  <strong>Lanes:</strong> {edge.lanes} ({edge.direction})
                </p>
                {edge.trafficConditions.incidents && edge.trafficConditions.incidents.length > 0 && (
                  <div className="mt-2 p-2 bg-red-50 rounded">
                    <p className="text-xs font-semibold text-red-800 mb-1">
                      ⚠️ {edge.trafficConditions.incidents.length} Incident(s)
                    </p>
                    {edge.trafficConditions.incidents.map((incident) => (
                      <p key={incident.incidentId} className="text-xs text-red-700">
                        {incident.type} - {incident.severity}
                      </p>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  <strong>Updated:</strong> {new Date(edge.lastUpdated).toLocaleString()}
                </p>
              </div>
            </Popup>
          </Polyline>
        );
      })}
    </>
  );
});
