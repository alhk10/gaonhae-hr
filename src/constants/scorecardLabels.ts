/**
 * Default scorecard label suggestions used when an examiner first opens
 * the Grading Scorecard dialog for a registration that has no rows yet.
 *
 * Examiners can add/remove/reorder rows freely — these are *suggestions*,
 * not a fixed schema. Every row is a `{ label, value }` pair stored in
 * the JSONB `scorecard` column on `grading_registrations`.
 */

export interface ScorecardRow {
  label: string;
  value: string;
}

export const DEFAULT_SCORECARD_LABELS: string[] = [
  'Height',
  'Weight',
  'Poomsae',
  'Balchagi',
  'Kyorugi',
  'Hoshinsul',
  'Push-ups',
  'Leg Raises',
  'Air Squats',
];

export const buildDefaultScorecard = (): ScorecardRow[] =>
  DEFAULT_SCORECARD_LABELS.map(label => ({ label, value: '' }));

/**
 * Compute BMI from height (cm) and weight (kg) for display on the certificate.
 * Returns null when either input cannot be parsed as a positive number.
 */
export const computeBmi = (heightCm?: string | number | null, weightKg?: string | number | null): number | null => {
  const h = typeof heightCm === 'string' ? parseFloat(heightCm) : heightCm ?? NaN;
  const w = typeof weightKg === 'string' ? parseFloat(weightKg) : weightKg ?? NaN;
  if (!Number.isFinite(h) || !Number.isFinite(w) || h <= 0 || w <= 0) return null;
  const meters = h / 100;
  return Math.round((w / (meters * meters)) * 10) / 10;
};

/**
 * Pull the numeric value out of a scorecard row. Strips trailing units
 * (cm/kg) so "168 cm" → 168.
 */
export const extractNumeric = (raw?: string): number | null => {
  if (!raw) return null;
  const m = raw.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
};
