package org.swarch.servicies;

import org.swarch.Plan;
import org.swarch.Symptom;

import jakarta.enterprise.context.ApplicationScoped;

/**
 * PlanForSymptomServiceImpl
 */
@ApplicationScoped
public class PlanForSymptomServiceImpl implements PlanForSymptomService {

  @Override
  public Plan getPlanFromSymptom(Symptom symptom) {
    return switch (symptom) {
      case Symptom.TRAFFIC_JAM -> Plan.REROUTE_TRAFFIC;
      case Symptom.ROAD_BLOCKED -> Plan.CLEAR_ROADBLOCK;
      case Symptom.ACCESS_DROP -> Plan.INCREASE_ACCESSIBILITY;
      case Symptom.TRAVEL_DELAY -> Plan.OPTIMIZE_TRAVEL_TIME;
      case Symptom.SENSOR_FAILURE -> Plan.RESTART_SENSOR;
      case Symptom.DATA_DRIFT -> Plan.VALIDATE_DATA_SOURCE;
      case Symptom.GATEWAY_OFFLINE -> Plan.RESTORE_GATEWAY;
      case Symptom.WEATHER_HAZARD -> Plan.ACTIVATE_WEATHER_PROTOCOL;
      case Symptom.POLLUTION_SPIKE -> Plan.REDUCE_POLLUTION_IMPACT;
      case Symptom.INFRASTRUCTURE_OUTAGE -> Plan.FIX_INFRASTRUCTURE;
    };
  }

  @Override
  public void executePlannedStrategy(Plan plan) {
    System.out.println("Executing planned strategy for plan: " + plan);
    switch (plan) {
      case REROUTE_TRAFFIC -> System.out.println("Strategy: Rerouting traffic to alternative paths to reduce congestion.");
      case CLEAR_ROADBLOCK -> System.out.println("Strategy: Dispatching emergency services to clear roadblock.");
      case INCREASE_ACCESSIBILITY -> System.out.println("Strategy: Adjusting traffic signals and routes to improve access to critical services.");
      case OPTIMIZE_TRAVEL_TIME -> System.out.println("Strategy: Implementing dynamic speed limits and lane management to optimize travel times.");
      case RESTART_SENSOR -> System.out.println("Strategy: Remotely restarting faulty sensor and initiating diagnostics.");
      case VALIDATE_DATA_SOURCE -> System.out.println("Strategy: Cross-validating data sources and correcting data drift.");
      case RESTORE_GATEWAY -> System.out.println("Strategy: Rebooting gateway and checking network connectivity.");
      case ACTIVATE_WEATHER_PROTOCOL -> System.out.println("Strategy: Activating weather hazard protocols, including speed reductions and route diversions.");
      case REDUCE_POLLUTION_IMPACT -> System.out.println("Strategy: Activating pollution control measures, such as traffic restrictions in affected areas.");
      case FIX_INFRASTRUCTURE -> System.out.println("Strategy: Dispatching maintenance teams to repair infrastructure outage.");
      default -> System.out.println("Strategy: No specific action defined for plan " + plan);
    }
  }

}
