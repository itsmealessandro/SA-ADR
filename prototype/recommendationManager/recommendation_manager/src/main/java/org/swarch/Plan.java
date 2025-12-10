package org.swarch;

public enum Plan {
  REROUTE_TRAFFIC, // Redirect vehicles to alternative roads
  CLEAR_ROADBLOCK, // Dispatch units to remove road obstacles
  INCREASE_ACCESSIBILITY, // Prioritize routes to restore service access
  OPTIMIZE_TRAVEL_TIME, // Suggest faster paths to reduce delays
  RESTART_SENSOR, // Trigger remote sensor restart or check
  VALIDATE_DATA_SOURCE, // Verify data origin to correct inconsistencies
  RESTORE_GATEWAY, // Attempt reconnection or failover switch
  ACTIVATE_WEATHER_PROTOCOL, // Apply safety measures for severe weather
  REDUCE_POLLUTION_IMPACT, // Adjust mobility to limit pollution exposure
  FIX_INFRASTRUCTURE // Dispatch teams to restore infrastructure
}
