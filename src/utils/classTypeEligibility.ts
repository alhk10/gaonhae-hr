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
/**
 * Normalize a belt level string for comparison (trim + lowercase).
 */
export function normalizeBelt(belt: string): string {
  return belt.trim().toLowerCase();
}

/**
 * Check if a student's belt matches any of the allowed belt levels.
 * Uses normalized (case-insensitive, trimmed) comparison.
 * Returns true if no belt levels are specified (no filter).
 */
export function isBeltEligible(
  studentBelt: string | null | undefined,
  allowedBelts: string[] | null | undefined
): boolean {
  if (!allowedBelts || allowedBelts.length === 0) return true;
  if (!studentBelt) return false;
  const normalized = normalizeBelt(studentBelt);
  return allowedBelts.some(b => normalizeBelt(b) === normalized);
}

/**
 * Determine if a student is eligible for a class based on age,
 * considering their age exceptions and the timetable slot's age range.
 *
 * @returns true if the student is eligible
 */
export function isStudentEligibleForClass(options: {
  studentAge?: number;
  studentDob?: string | null;
  studentAllowedClassTypes?: string[] | null;
  classType?: string;
  timetableAgeFrom?: number | null;
  timetableAgeTo?: number | null;
}): boolean {
  const {
    studentAge: providedAge,
    studentDob,
    studentAllowedClassTypes,
    classType,
    timetableAgeFrom,
    timetableAgeTo,
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

  return true;
}

/**
 * Full eligibility check combining age, belt, and class type exception.
 * Returns { eligible: boolean, reason?: string } for diagnostics.
 */
export function checkFullEligibility(options: {
  studentDob?: string | null;
  studentBelt?: string | null;
  studentAllowedClassTypes?: string[] | null;
  classType?: string;
  timetableAgeFrom?: number | null;
  timetableAgeTo?: number | null;
  beltLevels?: string[] | null;
}): { eligible: boolean; reason?: string } {
  const {
    studentDob,
    studentBelt,
    studentAllowedClassTypes,
    classType,
    timetableAgeFrom,
    timetableAgeTo,
    beltLevels,
  } = options;

  // Check belt eligibility first
  if (!isBeltEligible(studentBelt, beltLevels)) {
    return { eligible: false, reason: `Belt mismatch: ${studentBelt || 'none'} not in [${beltLevels?.join(', ')}]` };
  }

  // Check age eligibility (with class type exception)
  const ageEligible = isStudentEligibleForClass({
    studentDob,
    studentAllowedClassTypes,
    classType,
    timetableAgeFrom,
    timetableAgeTo,
  });

  if (!ageEligible) {
    return { eligible: false, reason: 'Age outside allowed range' };
  }

  return { eligible: true };
}
