// Re-export all enums
export * from './enums';

// Re-export all interfaces
export * from './interfaces';

// Legacy type alias for backwards compatibility
export type Status = 'active' | 'inactive' | 'error' | 'degraded';

// Legacy type aliases for backwards compatibility
export type Boundaries = import('./interfaces').DistrictBoundaries;
export type Units = import('./interfaces').WeatherUnits;
export type Readings = import('./interfaces').WeatherReadings;
export type Node = import('./interfaces').TrafficNode;
export type TrafficConditionsIncident = import('./interfaces').TrafficIncident;
export type Geometry = import('./interfaces').EdgeGeometry;

