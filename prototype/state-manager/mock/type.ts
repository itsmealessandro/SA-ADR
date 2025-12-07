export interface City {
  cityId:            string;
  timestamp:         Date;
  metadata:          CityMetadata;
  districts:         District[];
  publicTransport:   PublicTransport;
  emergencyServices: EmergencyServices;
}

export interface DistrictGraph {
  nodes: Node[];
  edges: Edge[];
}

export interface Edge {
  edgeId:            string;
  roadSegmentId:     string;
  name:              string;
  class:             string;
  length:            number;
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
  location:     Ation;
  trafficLight: TrafficLight;
}

export interface Ation {
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
  districtGraph:   DistrictGraph;
}

export interface Building {
  buildingId:       string;
  name:             string;
  type:             string;
  location:         BuildingLocation;
  floors:           number;
  totalCapacity:    number;
  currentOccupancy: number;
  occupancyRate:    number;
  sensors:          Sensor[];
  status:           string;
}

export interface BuildingLocation {
  latitude:  number;
  longitude: number;
  address:   string;
}

export interface Sensor {
  sensorId:    string;
  type:        string;
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

export interface SensorMetadata {
  avgSpeed:         number;
  vehicleCount:     number;
  congestionStatus: string;
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
  location:    WeatherStationLocation;
  readings:    Readings;
  status:      Status;
  lastUpdated: Date;
}

export interface WeatherStationLocation {
  latitude:  number;
  longitude: number;
  elevation: number;
}

export interface Readings {
  temperature:   number;
  humidity:      number;
  pressure:      number;
  windSpeed:     number;
  windDirection: number;
  precipitation: number;
  cloudCover:    number;
  visibility:    number;
  uvIndex:       number;
  units:         Units;
}

export interface Units {
  temperature:   string;
  humidity:      string;
  pressure:      string;
  windSpeed:     string;
  windDirection: string;
  precipitation: string;
  cloudCover:    string;
  visibility:    string;
}

export interface EmergencyServices {
  incidents: EmergencyServicesIncident[];
  units:     Unit[];
}

export interface EmergencyServicesIncident {
  incidentId:      string;
  type:            string;
  priority:        string;
  location:        BuildingLocation;
  reportedAt:      Date;
  respondingUnits: string[];
  status:          string;
}

export interface Unit {
  unitId:            string;
  type:              string;
  status:            string;
  location:          Ation;
  destination?:      Ation;
  estimatedArrival?: Date;
}

export interface CityMetadata {
  name:        string;
  version:     string;
  lastUpdated: Date;
}

export interface PublicTransport {
  buses:    Bus[];
  stations: Station[];
}

export interface Bus {
  busId:            string;
  route:            string;
  location:         BusLocation;
  speed:            number;
  occupancy:        Occupancy;
  nextStop:         string;
  estimatedArrival: Date;
  status:           string;
}

export interface BusLocation {
  latitude:    number;
  longitude:   number;
  currentStop: string;
}

export interface Occupancy {
  current:  number;
  capacity: number;
}

export interface Station {
  stationId:        string;
  name:             string;
  type:             string;
  location:         Ation;
  platforms:        number;
  currentOccupancy: number;
  sensors:          Sensor[];
}
