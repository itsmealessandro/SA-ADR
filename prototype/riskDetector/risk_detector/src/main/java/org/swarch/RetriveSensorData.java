package org.swarch;

import io.quarkus.scheduler.Scheduled;
import org.swarch.servicies.CheckSymptomsService;
import org.swarch.servicies.GetSensorDataService;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.Properties;
import java.util.Map;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.StringSerializer;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * This class job is to constantly call the scheduled method retriveData() to
 * get the sensors values, and checks possible symptoms in the
 * checkSymptomsService
 */
@ApplicationScoped
public class RetriveSensorData {

  private static final Logger LOG = LoggerFactory.getLogger(RetriveSensorData.class);

  @Inject
  GetSensorDataService getSensorDataService;
  @Inject
  CheckSymptomsService checkSymptomsService;

  private KafkaProducer<String, String> producer;
  private final String symptomsTopic = "city.symptoms";
  private final ObjectMapper objectMapper = new ObjectMapper();

  public RetriveSensorData() {
    Properties props = new Properties();
    props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092");
    props.put(ProducerConfig.CLIENT_ID_CONFIG, "risk-detector-producer");
    props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
    props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());

    producer = new KafkaProducer<>(props);
    System.out.println("Kafka producer initialized for symptoms topic: " + symptomsTopic);
  }

  @Scheduled(every = "3s")
  public void retriveData() {
    LOG.info("Starting periodic data extraction and symptom check");

    System.err.println("#################################################");
    System.err.println("extractDataFromDB...");
    Object retrivedData = getSensorDataService.extractDataFromDB();

    checkSymptoms(retrivedData);

  }

  // checks if the data has some symptoms and in case calls the sendDataToPlanner
  // method
  public void checkSymptoms(Object retrivedData) {

    System.err.println("#################################################");
    System.err.println("checkSymptoms");
    LOG.info("Checking symptoms from extracted data");
    List<Symptom> symptoms = (List<Symptom>) checkSymptomsService.checkSymptoms(retrivedData);

    if (symptoms != null && !symptoms.isEmpty()) {

      System.err.println("symptoms found: " + symptoms);
      sendDataToPlanner(symptoms);
    }

  }

  // sends the symptoms to the planner
  public void sendDataToPlanner(List<Symptom> symptoms) {
    System.err.println("#################################################");
    System.err.println("Sending symptoms to planner");
    LOG.info("Sending symptoms to planner: {}", symptoms);

    if (producer == null) {
      System.err.println("Producer is null!");
      return;
    }

    try {
      for (Symptom symptom : symptoms) {
        String jsonMessage = objectMapper.writeValueAsString(Map.of("severity", symptom.name()));
        System.err.println("Sending symptom: " + jsonMessage + " to topic " + symptomsTopic);
        ProducerRecord<String, String> record = new ProducerRecord<>(symptomsTopic, symptom.name(), jsonMessage);
        producer.send(record).get();
        System.err.println("Symptom sent: " + symptom.name());
      }
    } catch (Exception e) {
      System.err.println("Error sending symptom: " + e.getMessage());
    }
  }

  /**
   * Sends a periodic test symptom to Kafka every 10 seconds.
   *
   * This method simulates sending a test symptom with the same structure
   * as when detecting real symptoms, for testing purposes.
   */
  @Scheduled(every = "10s")
  void sendPeriodicTestSymptom() {
    System.err.println("#################################################");
    System.err.println("Sending periodic test symptom...");

    try {
      // Simulate a test symptom (e.g., TRAFFIC_JAM severity)
      Symptom testSymptom = Symptom.TRAFFIC_JAM; // Using a valid enum value
      String jsonMessage = objectMapper.writeValueAsString(Map.of("severity", testSymptom.name()));

      ProducerRecord<String, String> record = new ProducerRecord<>(symptomsTopic, testSymptom.name(), jsonMessage);

      producer.send(record, (metadata, exception) -> {
        if (exception != null) {
          System.err.println("Send Error: " + exception.getMessage());
        } else {
          System.err.println("Periodic test symptom sent to topic " + metadata.topic());
        }
      });

    } catch (Exception e) {
      System.err.println("Error serializing test symptom: " + e.getMessage());
    }
  }

}
