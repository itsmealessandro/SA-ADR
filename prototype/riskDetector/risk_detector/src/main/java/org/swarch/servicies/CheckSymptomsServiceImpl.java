package org.swarch.servicies;

import org.swarch.Symptom;
import org.swarch.SymptomThreshold;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.List;
import java.util.ArrayList;
import java.util.Map;

@ApplicationScoped
public class CheckSymptomsServiceImpl implements CheckSymptomsService {

  @Inject
  GetSensorDataService getSensorDataService;

  @Override
  public List<Symptom> checkSymptoms(Object dataToCheck) {
    // Extract sensor data from InfluxDB using GetSensorDataService
    Map<String, Object> sensorData = (Map<String, Object>) getSensorDataService.extractDataFromDB();

    // Now check symptoms based on the extracted data
    return checkSymptomsFromData(sensorData);
  }

  private List<Symptom> checkSymptomsFromData(Map<String, Object> sensorData) {
    List<Symptom> symptoms = new ArrayList<>();
    System.out.println("checkSymptomsFromData called with " + sensorData.size() + " entries");

    // TRAFFIC_JAM: Check average speed from city sensors
    if (sensorData.containsKey("city_metrics_sensor_speed_value")) {
      double speed = (double) sensorData.get("city_metrics_sensor_speed_value");
      if (speed < SymptomThreshold.TRAFFIC_JAM.getValue()) {
        System.out.println("Symptom detected: TRAFFIC_JAM - Speed: " + speed + " < " + SymptomThreshold.TRAFFIC_JAM.getValue());
        symptoms.add(Symptom.TRAFFIC_JAM);
      }
    }

    // ROAD_BLOCKED: Check road conditions or zero speed
    if (sensorData.containsKey("city_metrics_sensor_camera_road_condition")) {
      String roadCondition = (String) sensorData.get("city_metrics_sensor_camera_road_condition");
      System.out.println("Checking road condition: " + roadCondition);
      if ("obstacles".equals(roadCondition) || "accident".equals(roadCondition) || "flooding".equals(roadCondition)) {
        System.out.println("Symptom detected: ROAD_BLOCKED - Road Condition: " + roadCondition);
        symptoms.add(Symptom.ROAD_BLOCKED);
      }
    }
    if (sensorData.containsKey("city_metrics_sensor_speed_value")) {
      double speed = (double) sensorData.get("city_metrics_sensor_speed_value");
      if (speed == SymptomThreshold.ROAD_BLOCKED.getValue()) {
        System.out.println("Symptom detected: ROAD_BLOCKED - Speed: " + speed + " = 0");
        symptoms.add(Symptom.ROAD_BLOCKED);
      }
    }

    // WEATHER_HAZARD: Check temperature or weather severity
    if (sensorData.containsKey("city_metrics_sensor_weather_value")) {
      double temp = (double) sensorData.get("city_metrics_sensor_weather_value");
      if (temp > 30.0 || temp < -10.0) {
        System.out.println("Symptom detected: WEATHER_HAZARD - Temperature: " + temp);
        symptoms.add(Symptom.WEATHER_HAZARD);
      }
    }

    // POLLUTION_SPIKE: Check air quality metrics from buildings
    if (sensorData.containsKey("buildings_metrics_air_quality_PM25_value")) {
      double pm25 = (double) sensorData.get("buildings_metrics_air_quality_PM25_value");
      if (pm25 > 50.0) {
        System.out.println("Symptom detected: POLLUTION_SPIKE - PM2.5: " + pm25 + " > 50");
        symptoms.add(Symptom.POLLUTION_SPIKE);
      }
    }
    if (sensorData.containsKey("buildings_metrics_air_quality_NO2_value")) {
      double no2 = (double) sensorData.get("buildings_metrics_air_quality_NO2_value");
      if (no2 > SymptomThreshold.POLLUTION_SPIKE.getValue()) {
        System.out.println("Symptom detected: POLLUTION_SPIKE - NO2: " + no2 + " > " + SymptomThreshold.POLLUTION_SPIKE.getValue());
        symptoms.add(Symptom.POLLUTION_SPIKE);
      }
    }

    // INFRASTRUCTURE_OUTAGE: Check elevators and emergency exits status
    int totalResources = 0;
    int nonOperational = 0;
    if (sensorData.containsKey("buildings_metrics_elevators_operational")) {
      boolean elevatorOp = (boolean) sensorData.get("buildings_metrics_elevators_operational");
      totalResources++;
      if (!elevatorOp) nonOperational++;
    }
    if (sensorData.containsKey("buildings_metrics_emergency_exits_operational")) {
      boolean exitOp = (boolean) sensorData.get("buildings_metrics_emergency_exits_operational");
      totalResources++;
      if (!exitOp) nonOperational++;
    }
    if (totalResources > 0 && (double) nonOperational / totalResources > SymptomThreshold.INFRASTRUCTURE_OUTAGE.getValue()) {
      System.out.println("Symptom detected: INFRASTRUCTURE_OUTAGE - Non-operational: " + nonOperational + "/" + totalResources);
      symptoms.add(Symptom.INFRASTRUCTURE_OUTAGE);
    }

    // SENSOR_FAILURE: Check battery levels or missing data
    if (sensorData.containsKey("vehicles_metrics_battery_level_value")) {
      double battery = (double) sensorData.get("vehicles_metrics_battery_level_value");
      if (battery < 20.0) {
        System.out.println("Symptom detected: SENSOR_FAILURE - Battery: " + battery + " < 20");
        symptoms.add(Symptom.SENSOR_FAILURE);
      }
    }

    // ACCESS_DROP: Placeholder for access level calculation
    // Assuming access level is calculated elsewhere, e.g., based on exits
    if (sensorData.containsKey("buildings_metrics_access_level_value")) {
      double accessLevel = (double) sensorData.get("buildings_metrics_access_level_value");
      if (accessLevel < SymptomThreshold.ACCESS_DROP.getValue()) {
        System.out.println("Symptom detected: ACCESS_DROP - Access Level: " + accessLevel + " < " + SymptomThreshold.ACCESS_DROP.getValue());
        symptoms.add(Symptom.ACCESS_DROP);
      }
    }

    // TRAVEL_DELAY: Check estimated travel times
    if (sensorData.containsKey("vehicles_metrics_eta_minutes_value")) {
      double eta = (double) sensorData.get("vehicles_metrics_eta_minutes_value");
      if (eta > SymptomThreshold.TRAVEL_DELAY.getValue()) {
        System.out.println("Symptom detected: TRAVEL_DELAY - ETA: " + eta + " > " + SymptomThreshold.TRAVEL_DELAY.getValue());
        symptoms.add(Symptom.TRAVEL_DELAY);
      }
    }

    // DATA_DRIFT: Check for anomalous data variations (simplified)
    if (sensorData.containsKey("city_metrics_sensor_speed_std_dev")) {
      double stdDev = (double) sensorData.get("city_metrics_sensor_speed_std_dev");
      if (stdDev > SymptomThreshold.DATA_DRIFT.getValue()) {
        System.out.println("Symptom detected: DATA_DRIFT - Std Dev: " + stdDev + " > " + SymptomThreshold.DATA_DRIFT.getValue());
        symptoms.add(Symptom.DATA_DRIFT);
      }
    }

    // GATEWAY_OFFLINE: Check offline time
    if (sensorData.containsKey("vehicles_metrics_offline_minutes_value")) {
      double offlineTime = (double) sensorData.get("vehicles_metrics_offline_minutes_value");
      if (offlineTime > SymptomThreshold.GATEWAY_OFFLINE.getValue()) {
        System.out.println("Symptom detected: GATEWAY_OFFLINE - Offline: " + offlineTime + " > " + SymptomThreshold.GATEWAY_OFFLINE.getValue());
        symptoms.add(Symptom.GATEWAY_OFFLINE);
      }
    }

    return symptoms;
  }
}
