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

    // City metrics: speed -> TRAFFIC_JAM if < 80
    if (sensorData.containsKey("city_metrics_sensor_speed_value")) {
      double speed = (double) sensorData.get("city_metrics_sensor_speed_value");
      if (speed < SymptomThreshold.TRAFFIC_JAM.getValue()) {
        System.err.println("Symptom detected: TRAFFIC_JAM - Speed: " + speed + " < " + SymptomThreshold.TRAFFIC_JAM.getValue());
        symptoms.add(Symptom.TRAFFIC_JAM);
      }
    }

    // City metrics: temperature -> WEATHER_HAZARD if > 30.0
    if (sensorData.containsKey("city_metrics_sensor_weather_value")) {
      double temp = (double) sensorData.get("city_metrics_sensor_weather_value");
      if (temp > 30.0) {
        System.err.println("Symptom detected: WEATHER_HAZARD - Temperature: " + temp + " > 30.0");
        symptoms.add(Symptom.WEATHER_HAZARD);
      }
    }

    // City metrics: road_condition -> ROAD_BLOCKED if obstacles
    if (sensorData.containsKey("city_metrics_sensor_camera_road_condition")) {
      String roadCondition = (String) sensorData.get("city_metrics_sensor_camera_road_condition");
      if ("obstacles".equals(roadCondition)) {
        System.err.println("Symptom detected: ROAD_BLOCKED - Road Condition: " + roadCondition);
        symptoms.add(Symptom.ROAD_BLOCKED);
      }
    }

    return symptoms;
  }
}
