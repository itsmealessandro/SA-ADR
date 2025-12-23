package org.swarch;

public enum SymptomThreshold {
  TRAFFIC_JAM(20.0), // Average speed < 20 km/h for congestion
  ACCESS_DROP(0.5), // < 0.5 access level
  TRAVEL_DELAY(30.0), // > 30 minutes travel time
  WEATHER_HAZARD(7.0), // > 7 severity or temperature > 30°C
  POLLUTION_SPIKE(150.0), // > 150 AQI or PM2.5 > 50 µg/m³
  ROAD_BLOCKED(0.0), // Speed = 0 km/h or critical road conditions
  SENSOR_FAILURE(0.5), // > 50% missing data or battery < 20%
  DATA_DRIFT(2.0), // Standard deviation > 2x historical mean
  GATEWAY_OFFLINE(15.0), // > 15 minutes offline
  INFRASTRUCTURE_OUTAGE(0.3); // > 30% critical resources non-operational

  private final double value;

  SymptomThreshold(double value) {
    this.value = value;
  }

  public double getValue() {
    return value;
  }
}
