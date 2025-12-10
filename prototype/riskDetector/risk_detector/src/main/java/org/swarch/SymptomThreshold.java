package org.swarch;

public enum SymptomThreshold {
  TRAFFIC_JAM(80), // > 80% traffic density
  ACCESS_DROP(0.5), // < 0.5 access level
  TRAVEL_DELAY(30), // > 30 minutes travel time
  WEATHER_HAZARD(7), // > 7 severity
  POLLUTION_SPIKE(150); // > 150 AQI or equivalent

  private final double value;

  SymptomThreshold(double value) {
    this.value = value;
  }

  public double getValue() {
    return value;
  }
}
