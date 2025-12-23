package org.swarch;

import io.quarkus.scheduler.Scheduled;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.swarch.servicies.PlanForSymptomService;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.Arrays;
import java.util.Properties;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * PlannerMain represents the Planning component of the MAPE-K loop.
 *
 * This class is responsible for:
 * - receiving or extracting detected symptoms (currently mocked),
 * - selecting an appropriate plan based on the symptom,
 * - executing the selected strategy through the planning service,
 * - notifying other system components by publishing a structured
 * notification message to a Kafka topic.
 *
 * The notification is serialized as JSON and sent to the
 * "city.notifications" Kafka topic, where it can be consumed by
 * external services (e.g., notification managers, dashboards, or alerting
 * systems).
 */
@ApplicationScoped
public class PlannerMain {

  private static final Logger LOG = LoggerFactory.getLogger(PlannerMain.class);

  @Inject
  PlanForSymptomService planforSymptomService;

  private KafkaProducer<String, String> producer;
  private KafkaConsumer<String, String> consumer;
  private final String notificationTopic = "city.notifications";
  private final String symptomsTopic = "city.symptoms";
  private final ObjectMapper objectMapper = new ObjectMapper();

  /**
   * Initializes the Kafka producer used to send notification messages.
   *
   * The producer is configured with basic settings such as bootstrap servers,
   * client ID, and string serializers for both keys and values.
   */
  public PlannerMain() {

    Properties props = new Properties();
    props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092");
    props.put(ProducerConfig.CLIENT_ID_CONFIG, "data-producer");
    props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
    props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());

    producer = new KafkaProducer<>(props);

    // Initialize consumer for symptoms topic
    Properties consumerProps = new Properties();
    consumerProps.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092");
    consumerProps.put(ConsumerConfig.GROUP_ID_CONFIG, "planner-group");
    consumerProps.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
    consumerProps.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
    consumerProps.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "latest");

    consumer = new KafkaConsumer<>(consumerProps);
    consumer.subscribe(Arrays.asList(symptomsTopic));
  }

  /**
   * Extracts the current symptom and triggers the planning workflow.
   *
   * This method polls the symptoms topic for incoming messages from the Analyzer.
   * For each received symptom message, it selects an appropriate plan,
   * executes the strategy, and notifies the system.
   */
  @Scheduled(every = "10s")
  void extract_symptoms() {
    LOG.info("Checking for new symptoms from analyzer");
    System.out.println("########################################");
    System.out.println("listening for symptoms from analyzer...");

    // Poll for new messages
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(1000));

    for (ConsumerRecord<String, String> record : records) {
      try {
        // Parse JSON message (assuming format similar to notifications)
        JsonNode symptomMessage = objectMapper.readTree(record.value());
        String symptomString = symptomMessage.get("severity").asText(); // e.g., "HIGH"

        LOG.info("Received symptom: {}", symptomString);
        System.out.println("Received symptom: " + symptomString);

        Symptom symptom = Symptom.valueOf(symptomString);

        Plan plan = planforSymptomService.getPlanFromSymptom(symptom);
        execute_strategy(plan, symptom);
        notify_strategy(plan, symptom);

      } catch (Exception e) {
        System.err.println("Error processing symptom message: " + e.getMessage());
      }
    }
  }

  /**
   * Sends a periodic test notification to Kafka every 5 seconds.
   *
   * This method simulates sending notifications with the same structure
   * as when executing a plan, for testing purposes.
   */
  @Scheduled(every = "5s")
  void sendPeriodicTestNotification() {
    System.out.println("########################################");
    System.out.println("Sending periodic test notification...");

    try {
      NotificationMessage notification = new NotificationMessage(
          "Periodic Test Notification - System Status OK",
          "info", // severity
          "Recommendation Manager (TEST)", // source
          String.valueOf(System.currentTimeMillis()) // timestamp as string
      );

      String jsonMessage = objectMapper.writeValueAsString(notification);

      ProducerRecord<String, String> record = new ProducerRecord<>(notificationTopic, jsonMessage);

      producer.send(record, (metadata, exception) -> {
        if (exception != null) {
          System.err.println("Send Error: " + exception.getMessage());
        } else {
          System.out.println("Periodic test notification sent to topic " + metadata.topic());
        }
      });

    } catch (Exception e) {
      System.err.println("Error serializing test notification: " + e.getMessage());
    }
  }

  /**
   * Executes the strategy associated with the selected plan.
   *
   * This method delegates the execution logic to the
   * PlanForSymptomService, which applies the planned actions
   * to the system.
   *
   * @param plan    the plan selected for the detected symptom
   * @param symptom the symptom that triggered the planning process
   */
  void execute_strategy(Plan plan, Symptom symptom) {
    System.out.println("########################################");
    System.out.println("executing strategy...");
    planforSymptomService.executePlannedStrategy(plan);
  }

  /**
   * Sends a notification message to Kafka describing the selected plan
   * and the originating symptom.
   *
   * The notification is serialized as JSON and published to the
   * "city.notifications" topic, allowing external consumers to
   * store, visualize, or react to planning decisions.
   *
   * @param plan    the plan that has been selected and executed
   * @param symptom the symptom that caused the plan selection
   */
  void notify_strategy(Plan plan, Symptom symptom) {
    System.out.println("########################################");
    System.out.println("notifying to kafka topic the symptom and the strategy...");

    try {
      NotificationMessage notification = new NotificationMessage(
          "Symptom " + symptom.name() + ", Plan " + plan.name(),
          mapSeverity(symptom), // mapped severity
          "Recommendation Manager (PLANNER)", // source
          String.valueOf(System.currentTimeMillis()) // timestamp as string
      );

      String jsonMessage = objectMapper.writeValueAsString(notification);

      ProducerRecord<String, String> record = new ProducerRecord<>(notificationTopic, jsonMessage);

      producer.send(record, (metadata, exception) -> {
        if (exception != null) {
          System.err.println("Send Error: " + exception.getMessage());
        } else {
          System.out.println("Message sent to topic " + metadata.topic());
        }
      });

    } catch (Exception e) {
      System.err.println("Error serializing notification: " + e.getMessage());
    }
  }

  /**
   * Maps a Symptom to a notification severity level.
   *
   * @param symptom the symptom to map
   * @return the corresponding severity string ("info", "warning", "error", "critical")
   */
  private String mapSeverity(Symptom symptom) {
    switch (symptom) {
      case TRAFFIC_JAM:
      case ROAD_BLOCKED:
      case ACCESS_DROP:
      case TRAVEL_DELAY:
        return "warning";
      case SENSOR_FAILURE:
      case DATA_DRIFT:
      case GATEWAY_OFFLINE:
        return "error";
      case WEATHER_HAZARD:
      case POLLUTION_SPIKE:
      case INFRASTRUCTURE_OUTAGE:
        return "critical";
      default:
        return "info";
    }
  }

  /**
   * Closes the Kafka producer and consumer, releasing all associated resources.
   *
   * This method should be called during application shutdown
   * to ensure a graceful termination.
   */
  public void closeProducer() {
    if (producer != null) {
      producer.close();
    }
    if (consumer != null) {
      consumer.close();
    }
  }
}
