import React, { useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import type { AcousticSensorData, AirQualitySensorData, Building, ElevatorData, EmergencyExit, StatusResult } from '../../types';
import {
  AirQualityStatus,
  BuildingIconName,
  BuildingType,
  ElevatorStatus,
  ExitStatus,
  NoiseLevelStatus,
  StatusColor,
} from '../../types';
import { createLucideIcon } from '../../utils/leafletIcon';

interface BuildingMarkersProps {
  buildings: Building[];
}

// Get building type icon
const getBuildingIcon = (type: string): BuildingIconName => {
  switch (type.toLowerCase()) {
    case BuildingType.HOSPITAL:
      return BuildingIconName.HOSPITAL;
    case BuildingType.SCHOOL:
    case BuildingType.UNIVERSITY:
      return BuildingIconName.GRADUATION_CAP;
    case BuildingType.CHURCH:
    case BuildingType.RELIGIOUS:
      return BuildingIconName.CHURCH;
    case BuildingType.OFFICE:
      return BuildingIconName.BRIEFCASE;
    case BuildingType.RESIDENTIAL:
      return BuildingIconName.HOME;
    default:
      return BuildingIconName.BUILDING;
  }
};

// Get building color based on status and conditions
const getBuildingColor = (building: Building): StatusColor => {
  // Check for critical issues
  if (building.managedResources) {
    const exits = building.managedResources.emergencyExits || [];
    const elevators = building.managedResources.elevators || [];
    
    // Critical: blocked exits
    const blockedExits = exits.filter(e => !e.operational || e.status === ExitStatus.LOCKED);
    if (blockedExits.length > exits.length / 2) return StatusColor.RED;
    
    // Warning: elevator issues
    const brokenElevators = elevators.filter(e => e.status !== ElevatorStatus.OPERATIONAL);
    if (brokenElevators.length > 0) return StatusColor.YELLOW;
  }
  
  // Check air quality
  if (building.airQuality && building.airQuality.length > 0) {
    for (const aq of building.airQuality) {
      if (aq.measurements.pm25 && aq.measurements.pm25 > 35) return StatusColor.RED;
      if (aq.measurements.co2 && aq.measurements.co2 > 1500) return StatusColor.YELLOW;
    }
  }
  
  return StatusColor.GREEN;
};

// Get air quality status
const getAirQualityStatus = (aq: AirQualitySensorData): StatusResult => {
  const pm25 = aq.measurements.pm25 || 0;
  const co2 = aq.measurements.co2 || 0;
  
  if (pm25 > 55 || co2 > 2000) return { status: AirQualityStatus.UNHEALTHY, color: StatusColor.RED };
  if (pm25 > 35 || co2 > 1500) return { status: AirQualityStatus.MODERATE, color: StatusColor.YELLOW };
  if (pm25 > 12 || co2 > 1000) return { status: AirQualityStatus.GOOD, color: StatusColor.LIGHT_GREEN };
  return { status: AirQualityStatus.EXCELLENT, color: StatusColor.GREEN };
};

// Get noise level status
const getNoiseLevelStatus = (noiseDb: number): StatusResult => {
  if (noiseDb > 85) return { status: NoiseLevelStatus.HAZARDOUS, color: StatusColor.RED };
  if (noiseDb > 70) return { status: NoiseLevelStatus.LOUD, color: StatusColor.ORANGE };
  if (noiseDb > 55) return { status: NoiseLevelStatus.MODERATE, color: StatusColor.YELLOW };
  return { status: NoiseLevelStatus.QUIET, color: StatusColor.GREEN };
};

// Get elevator status color
const getElevatorStatusColor = (status: ElevatorStatus | string): StatusColor => {
  switch (status.toLowerCase()) {
    case ElevatorStatus.OPERATIONAL:
      return StatusColor.GREEN;
    case ElevatorStatus.OUT_OF_SERVICE:
      return StatusColor.RED;
    case ElevatorStatus.BLOCKED:
      return StatusColor.DEEP_ORANGE;
    default:
      return StatusColor.GRAY;
  }
};

// Get exit status color
const getExitStatusColor = (exit: EmergencyExit): StatusColor => {
  if (!exit.operational) return StatusColor.RED;
  if (exit.status === ExitStatus.LOCKED) return StatusColor.ORANGE;
  return StatusColor.GREEN;
};

// Air Quality Section Component
const AirQualitySection = ({ airQuality }: { airQuality: AirQualitySensorData[] }) => (
  <div className="mt-3 p-2 bg-blue-50 rounded">
    <h4 className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
      🌬️ Air Quality ({airQuality.length} sensors)
    </h4>
    {airQuality.map((aq) => {
      const { status, color } = getAirQualityStatus(aq);
      return (
        <div key={aq.sensorId} className="mb-2 p-2 bg-white rounded text-xs">
          <div className="flex justify-between items-center mb-1">
            <span className="font-medium">{aq.location}</span>
            <span className="px-2 py-0.5 rounded-full text-white text-[10px]" style={{ backgroundColor: color }}>
              {status}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-gray-600">
            {aq.measurements.pm25 !== undefined && (
              <span>PM2.5: {aq.measurements.pm25} µg/m³</span>
            )}
            {aq.measurements.pm10 !== undefined && (
              <span>PM10: {aq.measurements.pm10} µg/m³</span>
            )}
            {aq.measurements.co2 !== undefined && (
              <span>CO₂: {aq.measurements.co2} ppm</span>
            )}
            {aq.measurements.no2 !== undefined && (
              <span>NO₂: {aq.measurements.no2} µg/m³</span>
            )}
            {aq.measurements.co !== undefined && (
              <span>CO: {aq.measurements.co} mg/m³</span>
            )}
            {aq.measurements.voc !== undefined && (
              <span>VOC: {aq.measurements.voc} µg/m³</span>
            )}
          </div>
        </div>
      );
    })}
  </div>
);

// Acoustic Section Component
const AcousticSection = ({ acoustic }: { acoustic: AcousticSensorData[] }) => (
  <div className="mt-3 p-2 bg-purple-50 rounded">
    <h4 className="text-xs font-semibold text-purple-800 mb-2 flex items-center gap-1">
      🔊 Acoustic Monitoring ({acoustic.length} sensors)
    </h4>
    {acoustic.map((ac) => {
      const { status, color } = getNoiseLevelStatus(ac.measurements.noiseLevel);
      return (
        <div key={ac.sensorId} className="mb-2 p-2 bg-white rounded text-xs">
          <div className="flex justify-between items-center mb-1">
            <span className="font-medium">{ac.location}</span>
            <span className="px-2 py-0.5 rounded-full text-white text-[10px]" style={{ backgroundColor: color }}>
              {status}
            </span>
          </div>
          <div className="text-gray-600">
            <span>Current: {ac.measurements.noiseLevel} dB</span>
            {ac.measurements.peakDb && <span className="ml-2">Peak: {ac.measurements.peakDb} dB</span>}
            {ac.measurements.averageDb1h && <span className="ml-2">Avg (1h): {ac.measurements.averageDb1h} dB</span>}
          </div>
        </div>
      );
    })}
  </div>
);

// Emergency Exits Section Component
const EmergencyExitsSection = ({ exits }: { exits: EmergencyExit[] }) => {
  const operationalCount = exits.filter(e => e.operational && e.status === ExitStatus.UNLOCKED).length;
  return (
    <div className="mt-3 p-2 bg-green-50 rounded">
      <h4 className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1">
        🚪 Emergency Exits ({operationalCount}/{exits.length} available)
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {exits.map((exit) => (
          <div
            key={exit.exitId}
            className="p-2 bg-white rounded text-xs border-l-4"
            style={{ borderLeftColor: getExitStatusColor(exit) }}
          >
            <div className="font-medium">{exit.location}</div>
            <div className="text-gray-600">
              <span>Floor {exit.floor}</span>
              <span className="mx-1">•</span>
              <span>{exit.widthM}m wide</span>
            </div>
            <div className="mt-1">
              <span
                className="px-1.5 py-0.5 rounded text-[10px]"
                style={{
                  backgroundColor: getExitStatusColor(exit),
                  color: 'white',
                }}
              >
                {exit.operational ? exit.status : 'Non-operational'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Elevators Section Component
const ElevatorsSection = ({ elevators }: { elevators: ElevatorData[] }) => {
  const operationalCount = elevators.filter(e => e.status === ElevatorStatus.OPERATIONAL).length;
  return (
    <div className="mt-3 p-2 bg-yellow-50 rounded">
      <h4 className="text-xs font-semibold text-yellow-800 mb-2 flex items-center gap-1">
        🛗 Elevators ({operationalCount}/{elevators.length} operational)
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {elevators.map((elev) => (
          <div
            key={elev.elevatorId}
            className="p-2 bg-white rounded text-xs border-l-4"
            style={{ borderLeftColor: getElevatorStatusColor(elev.status) }}
          >
            <div className="font-medium">{elev.location}</div>
            <div className="text-gray-600">
              <span>Floor {elev.currentFloor}</span>
              <span className="mx-1">•</span>
              <span>Cap: {elev.capacityPersons}</span>
            </div>
            <div className="mt-1">
              <span
                className="px-1.5 py-0.5 rounded text-[10px] text-white"
                style={{ backgroundColor: getElevatorStatusColor(elev.status) }}
              >
                {elev.status.replace('_', ' ')}
              </span>
            </div>
            {elev.faultDescription && (
              <div className="mt-1 text-red-600 text-[10px]">
                ⚠️ {elev.faultDescription}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Displays Section Component
const DisplaysSection = ({ displays }: { displays: Building['displays'] }) => {
  if (!displays || displays.length === 0) return null;
  const operationalCount = displays.filter(d => d.operational).length;
  return (
    <div className="mt-3 p-2 bg-gray-50 rounded">
      <h4 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1">
        📺 Displays ({operationalCount}/{displays.length} active)
      </h4>
      {displays.map((display) => (
        <div key={display.sensorId} className="mb-2 p-2 bg-white rounded text-xs">
          <div className="flex justify-between items-center mb-1">
            <span className="font-medium">{display.location}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] ${
                display.operational ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {display.operational ? 'Active' : 'Offline'}
            </span>
          </div>
          <div className="text-gray-600 italic">"{display.currentMessage}"</div>
        </div>
      ))}
    </div>
  );
};

export const BuildingMarkers = React.memo(function BuildingMarkers({ buildings }: BuildingMarkersProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <MarkerClusterGroup>
      {buildings.map((building) => {
        const color = getBuildingColor(building);
        const icon = getBuildingIcon(building.type);
        
        // Count resources
        const airQualityCount = building.airQuality?.length || 0;
        const acousticCount = building.acoustic?.length || 0;
        const exitsCount = building.managedResources?.emergencyExits?.length || 0;
        const elevatorsCount = building.managedResources?.elevators?.length || 0;
        const displaysCount = building.displays?.length || 0;

        return (
          <Marker
            key={building.buildingId}
            position={[building.location.latitude, building.location.longitude]}
            icon={createLucideIcon(icon, { backgroundColor: color })}
          >
            <Popup maxWidth={400} minWidth={320}>
              <div className="p-2 max-h-[500px] overflow-y-auto">
                {/* Header */}
                <div className="border-b pb-2 mb-2">
                  <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
                    <span className="text-lg">
                      {building.type === BuildingType.HOSPITAL ? '🏥' : 
                       building.type === BuildingType.SCHOOL ? '🏫' : 
                       building.type === BuildingType.UNIVERSITY ? '🎓' :
                       building.type === BuildingType.CHURCH || building.type === BuildingType.RELIGIOUS ? '⛪' : '🏢'}
                    </span>
                    {building.name}
                  </h3>
                  <p className="text-xs text-gray-500">{building.location.address}</p>
                </div>

                {/* Status Bar */}
                <div className="flex gap-2 mb-3 flex-wrap">
                  <span
                    className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: color + '20',
                      color: color,
                    }}
                  >
                    {building.status || 'operational'}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {building.type}
                  </span>
                  {building.floors && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {building.floors} floors
                    </span>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-5 gap-1 text-center text-xs mb-3">
                  <div className="p-1 bg-blue-50 rounded">
                    <div className="font-bold text-blue-600">{airQualityCount}</div>
                    <div className="text-gray-500">AQ</div>
                  </div>
                  <div className="p-1 bg-purple-50 rounded">
                    <div className="font-bold text-purple-600">{acousticCount}</div>
                    <div className="text-gray-500">Sound</div>
                  </div>
                  <div className="p-1 bg-green-50 rounded">
                    <div className="font-bold text-green-600">{exitsCount}</div>
                    <div className="text-gray-500">Exits</div>
                  </div>
                  <div className="p-1 bg-yellow-50 rounded">
                    <div className="font-bold text-yellow-600">{elevatorsCount}</div>
                    <div className="text-gray-500">Lifts</div>
                  </div>
                  <div className="p-1 bg-gray-50 rounded">
                    <div className="font-bold text-gray-600">{displaysCount}</div>
                    <div className="text-gray-500">Disp</div>
                  </div>
                </div>

                {/* Expandable Sections */}
                <div className="space-y-1">
                  {/* Air Quality Section */}
                  {building.airQuality && building.airQuality.length > 0 && (
                    <div>
                      <button
                        onClick={() => toggleSection('airQuality')}
                        className="w-full text-left px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded text-xs font-medium text-blue-800 flex justify-between items-center"
                      >
                        <span>🌬️ Air Quality ({building.airQuality.length})</span>
                        <span>{expandedSection === 'airQuality' ? '▲' : '▼'}</span>
                      </button>
                      {expandedSection === 'airQuality' && (
                        <AirQualitySection airQuality={building.airQuality} />
                      )}
                    </div>
                  )}

                  {/* Acoustic Section */}
                  {building.acoustic && building.acoustic.length > 0 && (
                    <div>
                      <button
                        onClick={() => toggleSection('acoustic')}
                        className="w-full text-left px-2 py-1 bg-purple-100 hover:bg-purple-200 rounded text-xs font-medium text-purple-800 flex justify-between items-center"
                      >
                        <span>🔊 Acoustic ({building.acoustic.length})</span>
                        <span>{expandedSection === 'acoustic' ? '▲' : '▼'}</span>
                      </button>
                      {expandedSection === 'acoustic' && (
                        <AcousticSection acoustic={building.acoustic} />
                      )}
                    </div>
                  )}

                  {/* Emergency Exits Section */}
                  {building.managedResources?.emergencyExits && building.managedResources.emergencyExits.length > 0 && (
                    <div>
                      <button
                        onClick={() => toggleSection('exits')}
                        className="w-full text-left px-2 py-1 bg-green-100 hover:bg-green-200 rounded text-xs font-medium text-green-800 flex justify-between items-center"
                      >
                        <span>🚪 Emergency Exits ({building.managedResources.emergencyExits.length})</span>
                        <span>{expandedSection === 'exits' ? '▲' : '▼'}</span>
                      </button>
                      {expandedSection === 'exits' && (
                        <EmergencyExitsSection exits={building.managedResources.emergencyExits} />
                      )}
                    </div>
                  )}

                  {/* Elevators Section */}
                  {building.managedResources?.elevators && building.managedResources.elevators.length > 0 && (
                    <div>
                      <button
                        onClick={() => toggleSection('elevators')}
                        className="w-full text-left px-2 py-1 bg-yellow-100 hover:bg-yellow-200 rounded text-xs font-medium text-yellow-800 flex justify-between items-center"
                      >
                        <span>🛗 Elevators ({building.managedResources.elevators.length})</span>
                        <span>{expandedSection === 'elevators' ? '▲' : '▼'}</span>
                      </button>
                      {expandedSection === 'elevators' && (
                        <ElevatorsSection elevators={building.managedResources.elevators} />
                      )}
                    </div>
                  )}

                  {/* Displays Section */}
                  {building.displays && building.displays.length > 0 && (
                    <div>
                      <button
                        onClick={() => toggleSection('displays')}
                        className="w-full text-left px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs font-medium text-gray-800 flex justify-between items-center"
                      >
                        <span>📺 Displays ({building.displays.length})</span>
                        <span>{expandedSection === 'displays' ? '▲' : '▼'}</span>
                      </button>
                      {expandedSection === 'displays' && (
                        <DisplaysSection displays={building.displays} />
                      )}
                    </div>
                  )}
                </div>

                {/* Last Updated */}
                {building.lastUpdated && (
                  <p className="text-xs text-gray-400 mt-3 pt-2 border-t">
                    Last updated: {new Date(building.lastUpdated).toLocaleString()}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MarkerClusterGroup>
  );
});
