/**
 * Shared utility for class type age eligibility checks.
 * Centralizes normalized comparison and age exception logic
 * so that attendance, scheduling, and invoicing all behave consistently.
 */

/**
 * Normalize a class type string for comparison (trim + lowercase).
 */
export function normalizeClassType(classType: string): string {
  return classType.trim().toLowerCase();
}

/**
 * Check if a student has an age exception for a given class type.
 * Uses normalized (case-insensitive, trimmed) comparison.
 */
export function hasClassTypeException(
  allowedClassTypes: string[] | null | undefined,
  classType: string
): boolean {
  if (!allowedClassTypes || !Array.isArray(allowedClassTypes) || allowedClassTypes.length === 0) {
    return false;
  }
  const normalized = normalizeClassType(classType);
  return allowedClassTypes.some(ct => normalizeClassType(ct) === normalized);
}

/**
 * Determine if a student is eligible for a class based on age,
 * considering their age exceptions, timetable-level age range,
 * and branch class type settings.
 *
 * @param studentAge - Student's current age (years)
 * @param studentDob - Student's date of birth (ISO string), used if studentAge not provided
 * @param studentAllowedClassTypes - Student's allowed_class_types array
 * @param classType - The class type being evaluated
 * @param timetableAgeFrom - Timetable slot's age_from
 * @param timetableAgeTo - Timetable slot's age_to
 * @param branchClassTypeSettings - Branch-level min/max age settings for this class type
 * @returns true if the student is eligible
 */
export function isStudentEligibleForClass(options: {
  studentAge?: number;
  studentDob?: string | null;
  studentAllowedClassTypes?: string[] | null;
  classType?: string;
  timetableAgeFrom?: number | null;
  timetableAgeTo?: number | null;
  branchMinAge?: number | null;
  branchMaxAge?: number | null;
}): boolean {
  const {
    studentAge: providedAge,
    studentDob,
    studentAllowedClassTypes,
    classType,
    timetableAgeFrom,
    timetableAgeTo,
    branchMinAge,
    branchMaxAge,
  } = options;

  // If student has an age exception for this class type, skip all age checks
  if (classType && hasClassTypeException(studentAllowedClassTypes, classType)) {
    return true;
  }

  // Calculate age from DOB if not provided
  let age = providedAge;
  if (age === undefined || age === null) {
    if (!studentDob) return true; // No DOB, can't filter by age
    const dob = new Date(studentDob);
    const today = new Date();
    age = Math.floor((today.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  }

  // Check timetable-level age range
  if (timetableAgeFrom !== undefined && timetableAgeFrom !== null && age < timetableAgeFrom) return false;
  if (timetableAgeTo !== undefined && timetableAgeTo !== null && age > timetableAgeTo) return false;

  // Check branch class type age settings
  if (branchMinAge !== undefined && branchMinAge !== null && age < branchMinAge) return false;
  if (branchMaxAge !== undefined && branchMaxAge !== null && age > branchMaxAge) return false;

  return true;
}
