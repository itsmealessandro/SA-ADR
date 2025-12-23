export interface City {
  cityId:            string;
  timestamp:         Date;
  metadata:          CityMetadata;
  districts:         District[];
  vehicles:          Vehicle[];
  cityGraph:         CityGraph;
}

export interface CityGraph {
  nodes: Node[];
  edges: Edge[];
}

export interface Edge {
  edgeId:            string;
  roadSegmentId:     string;
  name:              string;
  fromNode:          string;
  toNode:            string;
  geometry:          Geometry;
  distance:          number;
  speedLimit:        number;
  lanes:             number;
  direction:         string;
  trafficConditions: TrafficConditions;
  lastUpdated:       Date;
}

export interface Geometry {
  type:        string;
  coordinates: Array<number[]>;
}

export interface TrafficConditions {
  averageSpeed:    number;
  congestionLevel: string;
  vehicleCount:    number;
  travelTime:      number;
  incidents:       TrafficConditionsIncident[];
}

export interface TrafficConditionsIncident {
  incidentId:  string;
  type:        string;
  severity:    string;
  description: string;
  reportedAt:  Date;
}

export interface Node {
  nodeId:       string;
  type:         string;
  name:         string;
  location:     Location;
  trafficLight: TrafficLight;
}

export interface Location {
  latitude:  number;
  longitude: number;
}

export interface TrafficLight {
  status:        string;
  timeRemaining: number;
  cycleTime:     number;
}

export interface District {
  districtId:      string;
  name:            string;
  location:        DistrictLocation;
  sensors:         Sensor[];
  buildings:       Building[];
  weatherStations: WeatherStation[];
  gateways:        Gateway[];
}

// Gateway data from city-simulator
// Note: Gateways don't have edgeId - edge_id is a property of individual sensors
export interface Gateway {
  gatewayId:    string;
  name:         string;
  location:     GatewayLocation;
  lastUpdated:  Date;
  metadata:     GatewayMetadata;
  sensors:      GatewaySensor[];
}

export interface GatewayLocation {
  latitude:  number;
  longitude: number;
}

export interface GatewayMetadata {
  name:         string;
  version:      string;
  firmware:     string;
  sensorCounts: {
    speed:   number;
    weather: number;
    camera:  number;
  };
}

// Unified sensor format from gateway
export interface GatewaySensor {
  sensorId:          string;
  sensorType:        string;  // 'speed' | 'weather' | 'camera'
  gatewayId:         string;
  edgeId:            string;
  latitude:          number;
  longitude:         number;
  unit:              string;
  status:            string;
  // Speed sensor fields
  speedKmh?:         number;
  // Weather sensor fields
  temperatureC?:     number;
  humidity?:         number;
  weatherConditions?: string;
  // Camera sensor fields
  roadCondition?:    string;
  confidence?:       number;
  vehicleCount?:     number;
}

export interface Building {
  buildingId:       string;
  name:             string;
  type:             string;
  location:         BuildingLocation;
  status:           string;
  lastUpdated:      Date;
  // Air quality sensors from buildings-simulator
  airQuality?:      AirQualitySensorData[];
  // Acoustic sensors from buildings-simulator
  acoustic?:        AcousticSensorData[];
  // Display sensors from buildings-simulator
  displays?:        DisplaySensorData[];
  // Managed resources from buildings-simulator
  managedResources?: BuildingManagedResources;
  // Legacy fields (for backwards compatibility)
  floors?:          number;
  totalCapacity?:   number;
  currentOccupancy?: number;
  occupancyRate?:   number;
  sensors?:         Sensor[];
}

// Air quality sensor data from buildings-simulator
export interface AirQualitySensorData {
  sensorId:     string;
  location:     string;
  type:         string;
  measurements: {
    pm25?:      number;
    pm10?:      number;
    no2?:       number;
    co?:        number;
    o3?:        number;
    voc?:       number;
    co2?:       number;
  };
  lastReading:  string;
  status:       string;
}

// Acoustic sensor data from buildings-simulator
export interface AcousticSensorData {
  sensorId:     string;
  location:     string;
  type:         string;
  measurements: {
    noiseLevel:   number;
    peakDb?:      number;
    averageDb1h?: number;
  };
  lastReading:  string;
  status:       string;
}

// Display sensor data from buildings-simulator
export interface DisplaySensorData {
  sensorId:       string;
  type:           string;
  location:       string;
  coordinates?:   { latitude: number; longitude: number };
  currentMessage: string;
  operational:    boolean;
  lastUpdate:     string;
}

// Emergency exit from buildings-simulator
export interface EmergencyExit {
  exitId:      string;
  location:    string;
  floor:       number;
  status:      string;
  operational: boolean;
  widthM:      number;
  lastCheck:   string;
}

// Elevator from buildings-simulator
export interface ElevatorData {
  elevatorId:       string;
  location:         string;
  status:           string;
  currentFloor:     number;
  capacityPersons:  number;
  faultDescription?: string;
}

// Building managed resources
export interface BuildingManagedResources {
  emergencyExits: EmergencyExit[];
  elevators:      ElevatorData[];
}

export interface BuildingLocation {
  latitude:   number;
  longitude:  number;
  address:    string;
  altitudeM?: number;
}

// Vehicle data from vehicles-simulator
export interface Vehicle {
  vehicleId:        string;
  type:             string;
  lastUpdated:      Date;
  gpsPosition:      VehicleGpsPosition;
  movement:         VehicleMovement;
  managedResources: VehicleManagedResources;
  sensors:          VehicleSensors;
  routePlanning:    VehicleRoutePlanning;
}

export interface VehicleGpsPosition {
  latitude:   number;
  longitude:  number;
  altitudeM:  number;
}

export interface VehicleMovement {
  speedKmh:         number;
  directionDegrees: number;
  heading:          string;
}

export interface VehicleManagedResources {
  batteryLevelPercent: number;
  firmwareVersion:     string;
}

export interface VehicleSensors {
  accelerometer: {
    sensorId:             string;
    incidentDetected:     boolean;
    thresholdG:           number;
    lastReadingTimestamp: string;
  };
}

export interface VehicleRoutePlanning {
  currentDestination?: {
    latitude:     number;
    longitude:    number;
    locationName: string;
  };
  predictedDestinations: Array<{
    latitude:     number;
    longitude:    number;
    locationName: string;
    etaMinutes:   number;
    probability:  number;
  }>;
  routePriority: string;
}

export interface Sensor {
  sensorId:    string;
  type:        string;
  edgeId?:     string;  // Graph edge ID (E-00000 to E-03458)
  gatewayId?:  string;  // Gateway ID that collected this sensor data
  floor?:      number;
  value:       number;
  unit:        string;
  status:      Status;
  lastUpdated: Date;
  location?:   SensorLocation;
  metadata?:   SensorMetadata;
}

export interface SensorLocation {
  latitude:       number;
  longitude:      number;
  elevation?:     number;
  roadSegmentId?: string;
  direction?:     string;
  parkingLotId?:  string;
}

// Speed sensor reading from city-simulator
export interface SpeedSensorReading {
  sensor_id: string;
  speed_kmh: number;
  latitude: number;
  longitude: number;
}

// Weather sensor reading from city-simulator
export interface WeatherSensorReading {
  sensor_id: string;
  temperature_c: number;
  humidity: number;
  latitude: number;
  longitude: number;
}

// Camera sensor reading from city-simulator
export interface CameraSensorReading {
  sensor_id: string;
  road_condition: string;
  confidence: number;
  vehicle_count: number;
  latitude: number;
  longitude: number;
}

// Updated sensor metadata to support city-simulator data
export interface SensorMetadata {
  // Speed sensor metadata
  avgSpeed?:         number;
  sensorCount?:      number;
  readings?:         SpeedSensorReading[] | WeatherSensorReading[] | CameraSensorReading[];
  
  // Camera sensor metadata
  roadCondition?:    string;
  confidence?:       number;
  vehicleCount?:     number;
  congestionStatus?: string;
}

export enum Status {
  Active = "active",
}

export interface DistrictLocation {
  centerLatitude:  number;
  centerLongitude: number;
  boundaries:      Boundaries;
}

export interface Boundaries {
  north: number;
  south: number;
  east:  number;
  west:  number;
}

export interface WeatherStation {
  stationId:   string;
  name:        string;
  edgeId?:     string;  // Graph edge ID (E-00000 to E-03458)
  gatewayId?:  string;  // Gateway ID that collected this sensor data
  location:    WeatherStationLocation;
  readings:    Readings;
  status:      Status;
  lastUpdated: Date;
  metadata?:   {
    sensorCount: number;
    readings: WeatherSensorReading[];
  };
}

export interface WeatherStationLocation {
  latitude:  number;
  longitude: number;
  elevation: number;
}

export interface Readings {
  temperature:        number;
  humidity:           number;
  weatherConditions?: string;  // Weather conditions from city-simulator (clear, cloudy, rainy, foggy, snowy)
  units:              Units;
}

export interface Units {
  temperature:   string;
  humidity:      string;
}

// Note: EmergencyServices and PublicTransport have been replaced by the vehicles array in City

export interface CityMetadata {
  name:        string;
  version:     string;
  lastUpdated: Date;
}

// Note: PublicTransport (buses, stations) has been replaced by the vehicles array in City
