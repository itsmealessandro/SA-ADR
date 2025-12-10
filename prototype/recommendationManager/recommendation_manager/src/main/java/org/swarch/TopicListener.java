package org.swarch;

import org.swarch.servicies.PlanForSymptomService;

import jakarta.inject.Inject;

/**
 * TODO: adapt for kafka topic listening
 */
public class TopicListener {
  @Inject
  PlanForSymptomService planforSymptomService;

  void extract_symptoms() {
    System.out.println("########################################");
    System.out.println("extracting symptom...");
    // TODO: extract the symptoms from topic message

    String symptom_string = null;

    Symptom symptom = Symptom.valueOf(symptom_string);

    Plan plan = planforSymptomService.getPlanFromSymptom(symptom);
    execute_strategy(plan);
  }

  void execute_strategy(Plan plan) {

    System.out.println("########################################");
    System.out.println("executing strategy...");
    planforSymptomService.executePlannedStrategy(plan);
  }

}
