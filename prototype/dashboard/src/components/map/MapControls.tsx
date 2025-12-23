import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Filter, Layers, Truck } from 'lucide-react';
import { useState } from 'react';

export type LayerType = 'roads' | 'buildings' | 'sensors' | 'weather' | 'vehicles' | 'gateways';

interface MapControlsProps {
  visibleLayers: Record<LayerType, boolean>;
  onToggleLayer: (layer: LayerType) => void;
  // Sensor filters
  sensorFilters: string[];
  availableSensorTypes: string[];
  onToggleSensorFilter: (type: string) => void;
  // Gateway filter
  availableGateways: string[];
  selectedGateway: string | null;
  onSelectGateway: (gatewayId: string | null) => void;
  // Vehicle filters
  vehicleTypeFilters: string[];
  availableVehicleTypes: string[];
  onToggleVehicleTypeFilter: (type: string) => void;
}

const LAYER_LABELS: Record<LayerType, string> = {
  roads: 'Road Network',
  buildings: 'Buildings',
  sensors: 'IoT Sensors',
  weather: 'Weather Stations',
  vehicles: 'Vehicles',
  gateways: 'Gateways',
};

export function MapControls({
  visibleLayers,
  onToggleLayer,
  sensorFilters,
  availableSensorTypes,
  onToggleSensorFilter,
  availableGateways,
  selectedGateway,
  onSelectGateway,
  vehicleTypeFilters,
  availableVehicleTypes,
  onToggleVehicleTypeFilter,
}: MapControlsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSensorExpanded, setIsSensorExpanded] = useState(false);
  const [isVehicleExpanded, setIsVehicleExpanded] = useState(false);

  // Check if all sensor types are visible
  const allSensorsVisible = sensorFilters.length === 0;
  
  // Check if all vehicle types are visible
  const allVehiclesVisible = vehicleTypeFilters.length === 0;

  const handleSelectAllSensors = () => {
    if (allSensorsVisible) {
      // Hide all - add all types to filter
      availableSensorTypes.forEach(type => {
        if (!sensorFilters.includes(type)) {
          onToggleSensorFilter(type);
        }
      });
    } else {
      // Show all - remove all from filter
      sensorFilters.forEach(type => onToggleSensorFilter(type));
    }
  };

  const handleSelectAllVehicles = () => {
    if (allVehiclesVisible) {
      // Hide all
      availableVehicleTypes.forEach(type => {
        if (!vehicleTypeFilters.includes(type)) {
          onToggleVehicleTypeFilter(type);
        }
      });
    } else {
      // Show all
      vehicleTypeFilters.forEach(type => onToggleVehicleTypeFilter(type));
    }
  };

  return (
    <div className={`absolute top-4 left-4 z-[1000] transition-all duration-300 ${isExpanded ? 'w-72' : 'w-12'}`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute top-0 right-0 z-10 bg-white rounded-lg shadow-lg border border-gray-200 p-2 hover:bg-gray-50 transition-colors"
        aria-label={isExpanded ? 'Collapse filters' : 'Expand filters'}
      >
        {isExpanded ? (
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-600" />
        )}
      </button>

      {/* Panel Content */}
      {isExpanded && (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 pr-12 max-h-[calc(100vh-6rem)] overflow-y-auto">
          {/* Map Layers Section */}
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

          {/* Gateway Filter Section */}
          {visibleLayers.sensors && availableGateways.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                <Filter className="w-4 h-4 text-gray-500" />
                <h3 className="font-semibold text-sm text-gray-700">Gateway Filter</h3>
              </div>
              <select
                value={selectedGateway || ''}
                onChange={(e) => onSelectGateway(e.target.value || null)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Gateways ({availableGateways.length})</option>
                {availableGateways.map((gw) => (
                  <option key={gw} value={gw}>
                    {gw}
                  </option>
                ))}
              </select>
              {selectedGateway && (
                <p className="text-xs text-gray-500 mt-1">
                  Showing sensors from {selectedGateway}
                </p>
              )}
            </div>
          )}

          {/* Sensor Type Filters Section */}
          {visibleLayers.sensors && availableSensorTypes.length > 0 && (
            <div className="mb-4">
              <button
                onClick={() => setIsSensorExpanded(!isSensorExpanded)}
                className="flex items-center justify-between w-full mb-2 pb-2 border-b border-gray-100"
              >
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <h3 className="font-semibold text-sm text-gray-700">Sensor Types</h3>
                </div>
                {isSensorExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>
              
              {isSensorExpanded && (
                <div className="space-y-2">
                  {/* Select All */}
                  <label className="flex items-center justify-between cursor-pointer group pb-1 border-b border-gray-50">
                    <span className="text-sm font-medium text-blue-600 group-hover:text-blue-800">
                      Select All
                    </span>
                    <input
                      type="checkbox"
                      checked={allSensorsVisible}
                      onChange={handleSelectAllSensors}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                  </label>
                  
                  {availableSensorTypes.map((type) => (
                    <label key={type} className="flex items-center justify-between cursor-pointer group pl-2">
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
              )}
            </div>
          )}

          {/* Vehicle Type Filters Section */}
          {visibleLayers.vehicles && availableVehicleTypes.length > 0 && (
            <div className="mb-4">
              <button
                onClick={() => setIsVehicleExpanded(!isVehicleExpanded)}
                className="flex items-center justify-between w-full mb-2 pb-2 border-b border-gray-100"
              >
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-gray-500" />
                  <h3 className="font-semibold text-sm text-gray-700">Vehicle Types</h3>
                </div>
                {isVehicleExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>
              
              {isVehicleExpanded && (
                <div className="space-y-2">
                  {/* Select All */}
                  <label className="flex items-center justify-between cursor-pointer group pb-1 border-b border-gray-50">
                    <span className="text-sm font-medium text-blue-600 group-hover:text-blue-800">
                      Select All
                    </span>
                    <input
                      type="checkbox"
                      checked={allVehiclesVisible}
                      onChange={handleSelectAllVehicles}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                  </label>
                  
                  {availableVehicleTypes.map((type) => (
                    <label key={type} className="flex items-center justify-between cursor-pointer group pl-2">
                      <span className="text-sm text-gray-600 group-hover:text-gray-900 capitalize">
                        {type === 'fire_truck' ? 'Fire Truck' : type.replace('_', ' ')}
                      </span>
                      <input
                        type="checkbox"
                        checked={!vehicleTypeFilters.includes(type)}
                        onChange={() => onToggleVehicleTypeFilter(type)}
                        className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
