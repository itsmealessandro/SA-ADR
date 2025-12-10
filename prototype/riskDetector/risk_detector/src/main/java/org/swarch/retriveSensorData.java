package org.swarch;

import org.jetbrains.annotations.Async.Schedule;
import org.swarch.servicies.CheckSymptomsService;
import org.swarch.servicies.GetSensorDataService;

import jakarta.inject.Inject;

/**
 * This class job is to constantly call the scheduled method retriveData() to
 * get the sensors values, and checks possible symptoms in the
 * checkSymptomsService
 */
public class retriveSensorData {

  @Inject
  GetSensorDataService getSensorDataService;
  @Inject
  CheckSymptomsService checkSymptomsService;

  @Schedule
  public void retriveData() {

    System.out.println("#################################################");
    System.out.println("extractDataFromDB...");
    Object retrivedData = getSensorDataService.extractDataFromDB();

    checkSymptoms(retrivedData);

  }

  // checks if the data has some symptoms and in case calls the sendDataToPlanner
  // method
  public void checkSymptoms(Object retrivedData) {

    System.out.println("#################################################");
    System.out.println("checkSymptoms");
    Object scanResult = checkSymptomsService.checkSymptoms(retrivedData);

    if (scanResult != null) {

      System.out.println("symptoms found");
      sendDataToPlanner(scanResult);
    }

  }

  // sends the symptoms to the planner
  public void sendDataToPlanner(Object scanResult) {
    System.out.println("#################################################");
    System.out.println("Sending symptoms to planner");

  }

}
