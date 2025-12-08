// ==================== State Manager Types (from backend) ====================

export interface Location {
  latitude: number;
  longitude: number;
}

export interface BuildingLocation {
  latitude: number;
  longitude: number;
  address: string;
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

export interface Boundaries {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface DistrictLocation {
  centerLatitude: number;
  centerLongitude: number;
  boundaries: Boundaries;
}

export type Status = 'active' | 'inactive' | 'error' | 'degraded';

export interface SensorMetadata {
  avgSpeed: number;
  vehicleCount: number;
  congestionStatus: string;
}

export interface Sensor {
  sensorId: string;
  type: string;
  floor?: number;
  value: number;
  unit: string;
  status: Status;
  lastUpdated: Date | string;
  location?: SensorLocation;
  metadata?: SensorMetadata;
}

export interface Building {
  buildingId: string;
  name: string;
  type: string;
  location: BuildingLocation;
  floors: number;
  totalCapacity: number;
  currentOccupancy: number;
  occupancyRate: number;
  sensors: Sensor[];
  status: string;
}

export interface Units {
  temperature: string;
  humidity: string;
  pressure: string;
  windSpeed: string;
  windDirection: string;
  precipitation: string;
  cloudCover: string;
  visibility: string;
}

export interface Readings {
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  cloudCover: number;
  visibility: number;
  uvIndex: number;
  units: Units;
}

export interface WeatherStation {
  stationId: string;
  name: string;
  location: WeatherStationLocation;
  readings: Readings;
  status: Status;
  lastUpdated: Date | string;
}

export interface TrafficLight {
  status: string;
  timeRemaining: number;
  cycleTime: number;
}

export interface Node {
  nodeId: string;
  type: string;
  name: string;
  location: Location;
  trafficLight: TrafficLight;
}

export interface TrafficConditionsIncident {
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
  incidents: TrafficConditionsIncident[];
}

export interface Geometry {
  type: string;
  coordinates: Array<number[]>;
}

export interface Edge {
  edgeId: string;
  roadSegmentId: string;
  name: string;
  fromNode: string;
  toNode: string;
  geometry: Geometry;
  distance: number;
  speedLimit: number;
  lanes: number;
  direction: string;
  trafficConditions: TrafficConditions;
  lastUpdated: Date | string;
}

export interface CityGraph {
  nodes: Node[];
  edges: Edge[];
}

export interface District {
  districtId: string;
  name: string;
  location: DistrictLocation;
  sensors: Sensor[];
  buildings: Building[];
  weatherStations: WeatherStation[];
}

export interface Occupancy {
  current: number;
  capacity: number;
}

export interface Bus {
  busId: string;
  route: string;
  location: BusLocation;
  speed: number;
  occupancy: Occupancy;
  nextStop: string;
  estimatedArrival: Date | string;
  status: string;
}

export interface Station {
  stationId: string;
  name: string;
  type: string;
  location: Location;
  platforms: number;
  currentOccupancy: number;
  sensors: Sensor[];
}

export interface PublicTransport {
  buses: Bus[];
  stations: Station[];
}

export interface Unit {
  unitId: string;
  type: string;
  status: string;
  location: Location;
  destination?: Location;
  estimatedArrival?: Date | string;
}

export interface EmergencyServicesIncident {
  incidentId: string;
  type: string;
  priority: string;
  location: BuildingLocation;
  reportedAt: Date | string;
  respondingUnits: string[];
  status: string;
}

export interface EmergencyServices {
  incidents: EmergencyServicesIncident[];
  units: Unit[];
}

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
  publicTransport: PublicTransport;
  emergencyServices: EmergencyServices;
  cityGraph: CityGraph;
}

// Alias for compatibility
export type CityState = City;

// ==================== Notification Types ====================

export type NotificationSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface Notification {
  _id: string;
  type: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  timestamp: string; // ISO timestamp
  source: string;
  districtId?: string;
  entityId?: string;
  entityType?: 'sensor' | 'building' | 'transport' | 'district';
  data?: Record<string, unknown>;
  read?: boolean;
  acknowledged?: boolean;
}

// ==================== API Response Types ====================

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

// ==================== WebSocket Message Types ====================

export interface WebSocketMessage {
  type: 'full_state' | 'incremental_update' | 'error' | 'connection' | 'ping' | 'district_update';
  data?: unknown;
  state?: CityState; // Full state for initial connection
  patch?: unknown; // jsondiffpatch patch object
  timestamp?: string;
  error?: string;
}

// ==================== State Update Types ====================

export interface StateUpdate {
  timestamp: string;
  patch: unknown; // jsondiffpatch patch
  sequenceNumber?: number;
}

// ==================== Query Parameters ====================

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
