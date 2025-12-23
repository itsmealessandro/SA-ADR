// ==================== Building Constants ====================

export const BuildingType = {
  HOSPITAL: 'hospital',
  SCHOOL: 'school',
  UNIVERSITY: 'university',
  CHURCH: 'church',
  RELIGIOUS: 'religious',
  OFFICE: 'office',
  RESIDENTIAL: 'residential',
  COMMERCIAL: 'commercial',
  INDUSTRIAL: 'industrial',
  GOVERNMENT: 'government',
} as const;

export type BuildingType = typeof BuildingType[keyof typeof BuildingType];

export const BuildingStatus = {
  OPERATIONAL: 'operational',
  MAINTENANCE: 'maintenance',
  CLOSED: 'closed',
  EMERGENCY: 'emergency',
} as const;

export type BuildingStatus = typeof BuildingStatus[keyof typeof BuildingStatus];

export const ElevatorStatus = {
  OPERATIONAL: 'operational',
  OUT_OF_SERVICE: 'out_of_service',
  BLOCKED: 'blocked',
  MAINTENANCE: 'maintenance',
} as const;

export type ElevatorStatus = typeof ElevatorStatus[keyof typeof ElevatorStatus];

export const ExitStatus = {
  UNLOCKED: 'unlocked',
  LOCKED: 'locked',
  BLOCKED: 'blocked',
} as const;

export type ExitStatus = typeof ExitStatus[keyof typeof ExitStatus];

// ==================== Air Quality Constants ====================

export const AirQualityStatus = {
  EXCELLENT: 'Excellent',
  GOOD: 'Good',
  MODERATE: 'Moderate',
  UNHEALTHY: 'Unhealthy',
} as const;

export type AirQualityStatus = typeof AirQualityStatus[keyof typeof AirQualityStatus];

// ==================== Noise Level Constants ====================

export const NoiseLevelStatus = {
  QUIET: 'Quiet',
  MODERATE: 'Moderate',
  LOUD: 'Loud',
  HAZARDOUS: 'Hazardous',
} as const;

export type NoiseLevelStatus = typeof NoiseLevelStatus[keyof typeof NoiseLevelStatus];

// ==================== Sensor Status Constants ====================

export const SensorStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ERROR: 'error',
  DEGRADED: 'degraded',
} as const;

export type SensorStatus = typeof SensorStatus[keyof typeof SensorStatus];

// ==================== Vehicle Constants ====================

export const VehicleType = {
  CAR: 'car',
  BUS: 'bus',
  TRUCK: 'truck',
  MOTORCYCLE: 'motorcycle',
  BICYCLE: 'bicycle',
  EMERGENCY: 'emergency',
} as const;

export type VehicleType = typeof VehicleType[keyof typeof VehicleType];

export const RoutePriority = {
  NORMAL: 'normal',
  HIGH: 'high',
  EMERGENCY: 'emergency',
} as const;

export type RoutePriority = typeof RoutePriority[keyof typeof RoutePriority];

// ==================== Icon Names ====================

export const BuildingIconName = {
  HOSPITAL: 'hospital',
  GRADUATION_CAP: 'graduation-cap',
  CHURCH: 'church',
  BRIEFCASE: 'briefcase',
  HOME: 'home',
  BUILDING: 'building',
} as const;

export type BuildingIconName = typeof BuildingIconName[keyof typeof BuildingIconName];

// ==================== Status Colors ====================

export const StatusColor = {
  GREEN: '#4CAF50',
  LIGHT_GREEN: '#8BC34A',
  YELLOW: '#FFC107',
  ORANGE: '#FF9800',
  DEEP_ORANGE: '#FF5722',
  RED: '#F44336',
  GRAY: '#9E9E9E',
} as const;

export type StatusColor = typeof StatusColor[keyof typeof StatusColor];

// ==================== Notification Constants ====================

export const NotificationSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
} as const;

export type NotificationSeverity = typeof NotificationSeverity[keyof typeof NotificationSeverity];

export const EntityType = {
  SENSOR: 'sensor',
  BUILDING: 'building',
  TRANSPORT: 'transport',
  DISTRICT: 'district',
  VEHICLE: 'vehicle',
} as const;

export type EntityType = typeof EntityType[keyof typeof EntityType];

// ==================== WebSocket Constants ====================

export const WebSocketMessageType = {
  FULL_STATE: 'full_state',
  INCREMENTAL_UPDATE: 'incremental_update',
  ERROR: 'error',
  CONNECTION: 'connection',
  PING: 'ping',
  DISTRICT_UPDATE: 'district_update',
} as const;

export type WebSocketMessageType = typeof WebSocketMessageType[keyof typeof WebSocketMessageType];

// ==================== Traffic Constants ====================

export const TrafficLightStatus = {
  RED: 'red',
  YELLOW: 'yellow',
  GREEN: 'green',
} as const;

export type TrafficLightStatus = typeof TrafficLightStatus[keyof typeof TrafficLightStatus];

export const CongestionLevel = {
  LOW: 'low',
  MODERATE: 'moderate',
  HIGH: 'high',
  SEVERE: 'severe',
} as const;

export type CongestionLevel = typeof CongestionLevel[keyof typeof CongestionLevel];

export const IncidentSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type IncidentSeverity = typeof IncidentSeverity[keyof typeof IncidentSeverity];

// ==================== Weather Constants ====================

export const WeatherCondition = {
  CLEAR: 'clear',
  CLOUDY: 'cloudy',
  RAINY: 'rainy',
  FOGGY: 'foggy',
  SNOWY: 'snowy',
} as const;

export type WeatherCondition = typeof WeatherCondition[keyof typeof WeatherCondition];
