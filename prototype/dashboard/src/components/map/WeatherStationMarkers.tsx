import { CloudSun } from 'lucide-react';
import { Marker, Popup } from 'react-leaflet';
import type { WeatherStation } from '../../types';
import { createLucideIcon } from '../../utils/leafletIcon';

interface WeatherStationMarkersProps {
  stations: WeatherStation[];
}

const createWeatherIcon = () => {
  return createLucideIcon(CloudSun, { backgroundColor: '#8b5cf6' });
};

export function WeatherStationMarkers({ stations }: WeatherStationMarkersProps) {
  return (
    <>
      {stations.map((station) => (
        <Marker
          key={station.stationId}
          position={[station.location.latitude, station.location.longitude]}
          icon={createWeatherIcon()}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold text-sm mb-1">
                🌤️ {station.name}
              </h3>
              <p className="text-xs text-gray-600 mb-1">
                <strong>Status:</strong>{' '}
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {station.status}
                </span>
              </p>
              <div className="mt-2 text-xs text-gray-600">
                <p className="mb-1">
                  <strong>Temperature:</strong> {station.readings.temperature}{station.readings.units.temperature}
                </p>
                <p className="mb-1">
                  <strong>Humidity:</strong> {station.readings.humidity}{station.readings.units.humidity}
                </p>
                <p className="mb-1">
                  <strong>Pressure:</strong> {station.readings.pressure}{station.readings.units.pressure}
                </p>
                <p className="mb-1">
                  <strong>Wind Speed:</strong> {station.readings.windSpeed}{station.readings.units.windSpeed}
                </p>
                <p className="mb-1">
                  <strong>Wind Direction:</strong> {station.readings.windDirection}°
                </p>
                <p className="mb-1">
                  <strong>Precipitation:</strong> {station.readings.precipitation}{station.readings.units.precipitation}
                </p>
                <p className="mb-1">
                  <strong>Cloud Cover:</strong> {station.readings.cloudCover}{station.readings.units.cloudCover}
                </p>
                <p className="mb-1">
                  <strong>Visibility:</strong> {station.readings.visibility}{station.readings.units.visibility}
                </p>
                <p className="mb-1">
                  <strong>UV Index:</strong> {station.readings.uvIndex}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                <strong>Updated:</strong> {new Date(station.lastUpdated).toLocaleString()}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
