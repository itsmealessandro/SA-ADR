package org.swarch;

/**
 * Symptoms
 */
public enum Symptom {
  TRAFFIC_JAM, // Excessive traffic compared to normal
  ROAD_BLOCKED, // Road is not passable or interrupted
  ACCESS_DROP, // Accessibility to critical services below threshold
  TRAVEL_DELAY, // Travel times higher than expected
  SENSOR_FAILURE, // Sensor not responding or missing data
  DATA_DRIFT, // Data inconsistent with expected values
  GATEWAY_OFFLINE, // Gateway unreachable or disconnected
  WEATHER_HAZARD, // Critical weather conditions (rain, snow, wind)
  POLLUTION_SPIKE, // Sudden increase in pollution levels
  INFRASTRUCTURE_OUTAGE // Failure of critical infrastructure
}
