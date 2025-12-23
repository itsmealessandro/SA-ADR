import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import type { WeatherSensorReading, WeatherStation } from '../../types';
import { SensorStatus, WeatherCondition } from '../../types';
import { createLucideIcon } from '../../utils/leafletIcon';

interface WeatherStationMarkersProps {
  stations: WeatherStation[];
}

// Weather condition icons and colors
const getWeatherIcon = (conditions: string | undefined): string => {
  const icons: Record<string, string> = {
    [WeatherCondition.CLEAR]: 'sun',
    [WeatherCondition.CLOUDY]: 'cloud',
    [WeatherCondition.RAINY]: 'cloud-rain',
    [WeatherCondition.FOGGY]: 'cloud-fog',
    [WeatherCondition.SNOWY]: 'cloud-snow',
  };
  return icons[conditions || ''] || 'cloud';
};

const getWeatherColor = (conditions: string | undefined): string => {
  const colors: Record<string, string> = {
    [WeatherCondition.CLEAR]: '#f59e0b',    // amber
    [WeatherCondition.CLOUDY]: '#6b7280',   // gray
    [WeatherCondition.RAINY]: '#3b82f6',    // blue
    [WeatherCondition.FOGGY]: '#9ca3af',    // light gray
    [WeatherCondition.SNOWY]: '#60a5fa',    // light blue
  };
  return colors[conditions || ''] || '#8b5cf6';
};

// Create icons based on weather conditions and status
const createWeatherIcon = (status: string, weatherConditions?: string) => {
  if (status !== SensorStatus.ACTIVE) {
    return createLucideIcon('cloud-off', { backgroundColor: '#6b7280' });
  }
  
  const iconName = getWeatherIcon(weatherConditions);
  const backgroundColor = getWeatherColor(weatherConditions);
  
  return createLucideIcon(iconName, { backgroundColor });
};

// Format individual sensor readings
const formatSensorReadings = (readings: WeatherSensorReading[]) => (
  <div className="mt-1 text-xs">
    <strong>Individual Sensors:</strong>
    <ul className="ml-2 mt-1">
      {readings.slice(0, 3).map((r) => (
        <li key={r.sensor_id}>
          {r.sensor_id}: {r.temperature_c.toFixed(1)}°C, {r.humidity.toFixed(0)}%
        </li>
      ))}
      {readings.length > 3 && <li>...and {readings.length - 3} more</li>}
    </ul>
  </div>
);

export const WeatherStationMarkers = React.memo(function WeatherStationMarkers({ stations }: WeatherStationMarkersProps) {
  return (
    <>
      {stations.map((station) => (
        <Marker
          key={station.stationId}
          position={[station.location.latitude, station.location.longitude]}
          icon={createWeatherIcon(station.status, station.readings.weatherConditions)}
        >
          <Popup>
            <div className="p-2 min-w-[220px]">
              <h3 className="font-semibold text-sm mb-1">
                {station.readings.weatherConditions === 'clear' && '☀️ '}
                {station.readings.weatherConditions === 'cloudy' && '☁️ '}
                {station.readings.weatherConditions === 'rainy' && '🌧️ '}
                {station.readings.weatherConditions === 'foggy' && '🌫️ '}
                {station.readings.weatherConditions === 'snowy' && '❄️ '}
                {station.name}
              </h3>
              
              {station.edgeId && (
                <p className="text-xs text-gray-600 mb-1">
                  <strong>Edge:</strong> {station.edgeId}
                </p>
              )}
              
              <p className="text-xs text-gray-600 mb-1">
                <strong>Status:</strong>{' '}
                <span
                  className={`
                    px-2 py-0.5 rounded-full text-xs font-medium
                    ${
                      station.status === SensorStatus.ACTIVE
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }
                  `}
                >
                  {station.status}
                </span>
              </p>
              
              {/* Weather conditions */}
              {station.readings.weatherConditions && (
                <p className="text-xs text-gray-600 mb-2">
                  <strong>Conditions:</strong>{' '}
                  <span className="capitalize font-medium" style={{ color: getWeatherColor(station.readings.weatherConditions) }}>
                    {station.readings.weatherConditions}
                  </span>
                </p>
              )}
              
              <div className="mt-2 text-xs text-gray-600 space-y-1">
                <p className="flex justify-between">
                  <span><strong>Temperature:</strong></span>
                  <span>{station.readings.temperature}°C</span>
                </p>
                <p className="flex justify-between">
                  <span><strong>Humidity:</strong></span>
                  <span>{station.readings.humidity}%</span>
                </p>
              </div>
              
              {/* Individual sensor readings */}
              {station.metadata?.readings && (
                <div className="mt-2 p-2 bg-blue-50 rounded">
                  <p className="text-xs"><strong>Sensors:</strong> {station.metadata.sensorCount}</p>
                  {formatSensorReadings(station.metadata.readings)}
                </div>
              )}
              
              <p className="text-xs text-gray-500 mt-2">
                <strong>Updated:</strong> {new Date(station.lastUpdated).toLocaleString()}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
});
