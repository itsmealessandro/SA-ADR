import { Filter, Layers } from 'lucide-react';

export type LayerType = 'roads' | 'buildings' | 'sensors' | 'weather' | 'buses';

interface MapControlsProps {
  visibleLayers: Record<LayerType, boolean>;
  onToggleLayer: (layer: LayerType) => void;
  sensorFilters: string[];
  availableSensorTypes: string[];
  onToggleSensorFilter: (type: string) => void;
}

const LAYER_LABELS: Record<LayerType, string> = {
  roads: 'Road Network',
  buildings: 'Buildings',
  sensors: 'IoT Sensors',
  weather: 'Weather Stations',
  buses: 'Public Transport',
};

export function MapControls({
  visibleLayers,
  onToggleLayer,
  sensorFilters,
  availableSensorTypes,
  onToggleSensorFilter,
}: MapControlsProps) {
  return (
    <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-64 max-h-[calc(100vh-2rem)] overflow-y-auto">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
          <Layers className="w-4 h-4 text-gray-500" />
          <h3 className="font-semibold text-sm text-gray-700">Map Layers</h3>
        </div>
        <div className="space-y-2">
          {(Object.keys(LAYER_LABELS) as LayerType[]).map((layer) => (
            <label key={layer} className="flex items-center justify-between cursor-pointer group">
              <span className="text-sm text-gray-600 group-hover:text-gray-900">
                {LAYER_LABELS[layer]}
              </span>
              <input
                type="checkbox"
                checked={visibleLayers[layer]}
                onChange={() => onToggleLayer(layer)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
            </label>
          ))}
        </div>
      </div>

      {visibleLayers.sensors && availableSensorTypes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
            <Filter className="w-4 h-4 text-gray-500" />
            <h3 className="font-semibold text-sm text-gray-700">Sensor Filters</h3>
          </div>
          <div className="space-y-2">
            {availableSensorTypes.map((type) => (
              <label key={type} className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm text-gray-600 group-hover:text-gray-900 capitalize">
                  {type}
                </span>
                <input
                  type="checkbox"
                  checked={!sensorFilters.includes(type)}
                  onChange={() => onToggleSensorFilter(type)}
                  className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
