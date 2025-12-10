package org.swarch.servicies;

import org.swarch.Plan;
import org.swarch.Symptom;

/**
 * PlanForSymptom
 */
public interface PlanForSymptomService {

  Plan getPlanFromSymptom(Symptom symptom);

  void executePlannedStrategy(Plan plan);
}
