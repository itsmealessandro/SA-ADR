import {
  ElevatorStatus,
  ExitStatus,
  NotificationSeverity,
  RoutePriority,
  SensorStatus,
  WebSocketMessageType
} from './enums';

// ==================== Location Interfaces ====================

export interface Location {
  latitude: number;
  longitude: number;
}

export interface BuildingLocation {
  latitude: number;
  longitude: number;
  address: string;
  altitudeM?: number;
}

export interface SensorLocation {
  latitude: number;
  longitude: number;
  elevation?: number;
  roadSegmentId?: string;
  direction?: string;
  parkingLotId?: string;
}

export interface WeatherStationLocation {
  latitude: number;
  longitude: number;
  elevation: number;
}

export interface BusLocation {
  latitude: number;
  longitude: number;
  currentStop: string;
}

export interface DistrictBoundaries {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface DistrictLocation {
  centerLatitude: number;
  centerLongitude: number;
  boundaries: DistrictBoundaries;
}

// ==================== Sensor Reading Interfaces ====================

export interface SpeedSensorReading {
  sensor_id: string;
  speed_kmh: number;
  latitude: number;
  longitude: number;
}

export interface WeatherSensorReading {
  sensor_id: string;
  temperature_c: number;
  humidity: number;
  latitude: number;
  longitude: number;
}

export interface CameraSensorReading {
  sensor_id: string;
  road_condition: string;
  confidence: number;
  vehicle_count: number;
  latitude: number;
  longitude: number;
}

export interface SensorMetadata {
  avgSpeed?: number;
  sensorCount?: number;
  readings?: SpeedSensorReading[] | WeatherSensorReading[] | CameraSensorReading[];
  roadCondition?: string;
  confidence?: number;
  vehicleCount?: number;
  congestionStatus?: string;
}

export interface Sensor {
  sensorId: string;
  type: string;
  edgeId?: string;  // Graph edge ID (E-00000 to E-03458)
  gatewayId?: string;  // Gateway ID that collected this sensor data
  floor?: number;
  value: number;
  unit: string;
  status: SensorStatus;
  lastUpdated: Date | string;
  location?: SensorLocation;
  metadata?: SensorMetadata;
}

// ==================== Air Quality Interfaces ====================

export interface AirQualityMeasurements {
  pm25?: number;
  pm10?: number;
  no2?: number;
  co?: number;
  o3?: number;
  voc?: number;
  co2?: number;
}

export interface AirQualitySensorData {
  sensorId: string;
  location: string;
  type: string;
  measurements: AirQualityMeasurements;
  lastReading: string;
  status: string;
}

// ==================== Acoustic Interfaces ====================

export interface AcousticMeasurements {
  noiseLevel: number;
  peakDb?: number;
  averageDb1h?: number;
}

export interface AcousticSensorData {
  sensorId: string;
  location: string;
  type: string;
  measurements: AcousticMeasurements;
  lastReading: string;
  status: string;
}

// ==================== Display Interfaces ====================

export interface DisplayCoordinates {
  latitude: number;
  longitude: number;
}

export interface DisplaySensorData {
  sensorId: string;
  type: string;
  location: string;
  coordinates?: DisplayCoordinates;
  currentMessage: string;
  operational: boolean;
  lastUpdate: string;
}

// ==================== Emergency Exit Interfaces ====================

export interface EmergencyExit {
  exitId: string;
  location: string;
  floor: number;
  status: ExitStatus;
  operational: boolean;
  widthM: number;
  lastCheck: string;
}

// ==================== Elevator Interfaces ====================

export interface ElevatorData {
  elevatorId: string;
  location: string;
  status: ElevatorStatus;
  currentFloor: number;
  capacityPersons: number;
  faultDescription?: string;
}

// ==================== Building Interfaces ====================

export interface BuildingManagedResources {
  emergencyExits: EmergencyExit[];
  elevators: ElevatorData[];
}

export interface Building {
  buildingId: string;
  name: string;
  type: string;
  location: BuildingLocation;
  status: string;
  lastUpdated?: Date | string;
  airQuality?: AirQualitySensorData[];
  acoustic?: AcousticSensorData[];
  displays?: DisplaySensorData[];
  managedResources?: BuildingManagedResources;
  floors?: number;
  totalCapacity?: number;
  currentOccupancy?: number;
  occupancyRate?: number;
  sensors?: Sensor[];
}

// ==================== Vehicle Interfaces ====================

export interface VehicleGpsPosition {
  latitude: number;
  longitude: number;
  altitudeM: number;
}

export interface VehicleMovement {
  speedKmh: number;
  directionDegrees: number;
  heading: string;
}

export interface VehicleManagedResources {
  batteryLevelPercent: number;
  firmwareVersion: string;
}

export interface AccelerometerData {
  sensorId: string;
  incidentDetected: boolean;
  thresholdG: number;
  lastReadingTimestamp: string;
}

export interface VehicleSensors {
  accelerometer: AccelerometerData;
}

export interface DestinationData {
  latitude: number;
  longitude: number;
  locationName: string;
}

export interface PredictedDestination {
  latitude: number;
  longitude: number;
  locationName: string;
  etaMinutes: number;
  probability: number;
}

export interface VehicleRoutePlanning {
  currentDestination?: DestinationData;
  predictedDestinations: PredictedDestination[];
  routePriority: RoutePriority;
}

export interface Vehicle {
  vehicleId: string;
  type: string;
  lastUpdated: Date | string;
  gpsPosition: VehicleGpsPosition;
  movement: VehicleMovement;
  managedResources: VehicleManagedResources;
  sensors: VehicleSensors;
  routePlanning: VehicleRoutePlanning;
}

// ==================== Weather Station Interfaces ====================

export interface WeatherUnits {
  temperature: string;
  humidity: string;
}

export interface WeatherReadings {
  temperature: number;
  humidity: number;
  weatherConditions?: string;
  units: WeatherUnits;
}

export interface WeatherStationMetadata {
  sensorCount: number;
  readings: WeatherSensorReading[];
}

export interface WeatherStation {
  stationId: string;
  name: string;
  edgeId?: string;  // Graph edge ID (E-00000 to E-03458)
  gatewayId?: string;  // Gateway ID that collected this sensor data
  location: WeatherStationLocation;
  readings: WeatherReadings;
  status: SensorStatus;
  lastUpdated: Date | string;
  metadata?: WeatherStationMetadata;
}

// ==================== Traffic Interfaces ====================

export interface TrafficLight {
  status: string;
  timeRemaining: number;
  cycleTime: number;
}

export interface TrafficNode {
  nodeId: string;
  type: string;
  name: string;
  location: Location;
  trafficLight: TrafficLight;
}

export interface TrafficIncident {
  incidentId: string;
  type: string;
  severity: string;
  description: string;
  reportedAt: Date | string;
}

export interface TrafficConditions {
  averageSpeed: number;
  congestionLevel: string;
  vehicleCount: number;
  travelTime: number;
  incidents: TrafficIncident[];
}

export interface EdgeGeometry {
  type: string;
  coordinates: Array<number[]>;
}

export interface Edge {
  edgeId: string;
  roadSegmentId: string;
  name: string;
  fromNode: string;
  toNode: string;
  geometry: EdgeGeometry;
  distance: number;
  speedLimit: number;
  lanes: number;
  direction: string;
  trafficConditions: TrafficConditions;
  lastUpdated: Date | string;
}

export interface CityGraph {
  nodes: TrafficNode[];
  edges: Edge[];
}

// ==================== District Interfaces ====================

export interface District {
  districtId: string;
  name: string;
  location: DistrictLocation;
  sensors: Sensor[];
  buildings: Building[];
  weatherStations: WeatherStation[];
  gateways: Gateway[];
}

// ==================== Gateway Interfaces ====================

export interface GatewayLocation {
  latitude: number;
  longitude: number;
}

export interface GatewaySensorCounts {
  speed: number;
  weather: number;
  camera: number;
}

export interface GatewayMetadata {
  name: string;
  version: string;
  firmware: string;
  sensorCounts: GatewaySensorCounts;
}

// Unified sensor format from gateway
export interface GatewaySensor {
  sensorId: string;
  sensorType: string;  // 'speed' | 'weather' | 'camera'
  gatewayId: string;
  edgeId: string;  // Graph edge ID (E-00000 to E-03458)
  latitude: number;
  longitude: number;
  unit: string;
  status: string;
  // Speed sensor fields
  speedKmh?: number;
  // Weather sensor fields
  temperatureC?: number;
  humidity?: number;
  weatherConditions?: string;
  // Camera sensor fields
  roadCondition?: string;
  confidence?: number;
  vehicleCount?: number;
}

export interface Gateway {
  gatewayId: string;
  name: string;
  location: GatewayLocation;
  lastUpdated: Date | string;
  metadata: GatewayMetadata;
  sensors: GatewaySensor[];
}

// ==================== City Interfaces ====================

export interface CityMetadata {
  name: string;
  version: string;
  lastUpdated: Date | string;
}

export interface City {
  cityId: string;
  timestamp: Date | string;
  metadata: CityMetadata;
  districts: District[];
  vehicles: Vehicle[];
  cityGraph: CityGraph;
}

export type CityState = City;

// ==================== Notification Interfaces ====================

export interface Notification {
  _id: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  timestamp: string;
  source: string;
  read?: boolean;
  acknowledged?: boolean;
}

// ==================== API Response Interfaces ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  page?: number;
  limit?: number;
}

// ==================== WebSocket Interfaces ====================

export interface WebSocketMessage {
  type: WebSocketMessageType;
  data?: unknown;
  state?: CityState;
  patch?: unknown;
  timestamp?: string;
  error?: string;
}

// ==================== State Update Interfaces ====================

export interface StateUpdate {
  timestamp: string;
  patch: unknown;
  sequenceNumber?: number;
}

// ==================== Query Parameter Interfaces ====================

export interface NotificationQueryParams {
  timestampFrom?: string;
  timestampTo?: string;
  severity?: NotificationSeverity;
  type?: string;
  districtId?: string;
  limit?: number;
  page?: number;
  read?: boolean;
}

export interface DistrictQueryParams {
  includeSensors?: boolean;
  includeBuildings?: boolean;
  includeTransport?: boolean;
}

// ==================== Status Result Interfaces ====================

export interface StatusResult {
  status: string;
  color: string;
}
