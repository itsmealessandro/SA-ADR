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
    // TODO Auto-generated method stub
    throw new UnsupportedOperationException("Unimplemented method 'executePlannedStrategy'");
  }

}
