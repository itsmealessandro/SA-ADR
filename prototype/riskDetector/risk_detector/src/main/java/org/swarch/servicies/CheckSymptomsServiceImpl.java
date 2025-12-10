package org.swarch.servicies;

import org.swarch.Symptom;
import org.swarch.SymptomThreshold;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Map;

@ApplicationScoped
public class CheckSymptomsServiceImpl implements CheckSymptomsService {

  @Override
  public Symptom checkSymptoms(Object dataToCheck) {
    if (!(dataToCheck instanceof Map)) {
      throw new IllegalArgumentException("dataToCheck must be a Map<String, Object>");
    }

    Map<String, Object> sensorData = (Map<String, Object>) dataToCheck;

    if (sensorData.containsKey("traffic")
        && (int) sensorData.get("traffic") > SymptomThreshold.TRAFFIC_JAM.getValue()) {
      return Symptom.TRAFFIC_JAM;
    }

    if (sensorData.containsKey("roadStatus") && "blocked".equals(sensorData.get("roadStatus"))) {
      return Symptom.ROAD_BLOCKED;
    }

    if (sensorData.containsKey("criticalAccess")
        && (double) sensorData.get("criticalAccess") < SymptomThreshold.ACCESS_DROP.getValue()) {
      return Symptom.ACCESS_DROP;
    }

    if (sensorData.containsKey("travelTime")
        && (int) sensorData.get("travelTime") > SymptomThreshold.TRAVEL_DELAY.getValue()) {
      return Symptom.TRAVEL_DELAY;
    }

    if (sensorData.containsKey("sensorAlive") && !(boolean) sensorData.get("sensorAlive")) {
      return Symptom.SENSOR_FAILURE;
    }

    if (sensorData.containsKey("dataConsistency") && !(boolean) sensorData.get("dataConsistency")) {
      return Symptom.DATA_DRIFT;
    }

    if (sensorData.containsKey("gatewayOnline") && !(boolean) sensorData.get("gatewayOnline")) {
      return Symptom.GATEWAY_OFFLINE;
    }

    if (sensorData.containsKey("weatherSeverity")
        && (int) sensorData.get("weatherSeverity") > SymptomThreshold.WEATHER_HAZARD.getValue()) {
      return Symptom.WEATHER_HAZARD;
    }

    if (sensorData.containsKey("pollutionLevel")
        && (int) sensorData.get("pollutionLevel") > SymptomThreshold.POLLUTION_SPIKE.getValue()) {
      return Symptom.POLLUTION_SPIKE;
    }

    if (sensorData.containsKey("infrastructureStatus") && "outage".equals(sensorData.get("infrastructureStatus"))) {
      return Symptom.INFRASTRUCTURE_OUTAGE;
    }

    return null;
  }
}
