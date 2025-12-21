package org.swarch;

import org.swarch.servicies.PlanForSymptomService;
import jakarta.inject.Inject;

import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;

import java.util.Properties;

public class PlannerMain {

  @Inject
  PlanForSymptomService planforSymptomService;

  private KafkaProducer<String, String> producer;
  private final String notificationTopic = "city.notifications";

  public PlannerMain() {

    Properties props = new Properties();
    props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092");
    props.put(ProducerConfig.CLIENT_ID_CONFIG, "data-producer");
    props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
    props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());

    producer = new KafkaProducer<>(props);
  }

  void extract_symptoms() {
    System.out.println("########################################");
    System.out.println("extracting symptom...");
    // TODO: estrarre i sintomi dal messaggio del topic
    String symptom_string = "HIGH"; // esempio statico
    Symptom symptom = Symptom.valueOf(symptom_string);

    Plan plan = planforSymptomService.getPlanFromSymptom(symptom);
    execute_strategy(plan, symptom);
    notify_strategy(plan, symptom);
  }

  void execute_strategy(Plan plan, Symptom symptom) {
    System.out.println("########################################");
    System.out.println("executing strategy...");
    planforSymptomService.executePlannedStrategy(plan);
  }

  void notify_strategy(Plan plan, Symptom symptom) {
    System.out.println("########################################");
    System.out.println("notifing to kafka topic the symptom and the strategy...");

    String message = "Symptom: " + symptom.name() + ", Plan: " + plan.name();
    ProducerRecord<String, String> record = new ProducerRecord<>(notificationTopic, message);

    producer.send(record, (metadata, exception) -> {
      if (exception != null) {
        System.err.println("Send Error" + exception.getMessage());
      } else {
        System.out.println("message sent" + message);
      }
    });
  }

  public void closeProducer() {
    if (producer != null) {
      producer.close();
    }
  }
}
