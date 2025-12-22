package org.swarch.servicies;

import org.swarch.Symptom;
import java.util.List;

/**
 * CheckSymptomsService
 */
public interface CheckSymptomsService {

  List<Symptom> checkSymptoms(Object dataToCheck);
}
