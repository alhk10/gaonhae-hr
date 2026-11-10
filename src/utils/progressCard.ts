export type Rating = 'exceptional' | 'acceptable' | 'guidance';
export type Readiness = 'yes' | 'no';

export const PROGRESS_SECTIONS: { key: string; title: string; items: string[] }[] = [
  { key: 'physical', title: 'Physical Development', items: ['Gross Motor Coordination', 'Fine Motor Coordination', 'Hand-Eye Coordination', 'Balance & Stability', 'Flexibility'] },
  { key: 'learning', title: 'Learning Skills', items: ['Ability to Follow Instructions', 'Listening Skills', 'Focus & Concentration', 'Confidence', 'Independence'] },
  { key: 'taekwondo', title: 'Taekwondo Skills', items: ['Basic Stances', 'Kicking Technique', 'Blocking Technique', 'Poomsae Memory', 'Etiquette & Respect'] },
  { key: 'character', title: 'Character Development', items: ['Respect', 'Discipline', 'Perseverance', 'Teamwork', 'Positive Attitude'] },
];

export const RATING_LABELS: Record<Rating, string> = { exceptional: 'Exceptional', acceptable: 'Acceptable', guidance: 'Needs Guidance' };
export const READINESS_LABELS: Record<Readiness, string> = { yes: 'Yes', no: 'No' };

export const ratingKey = (section: string, item: string) => `${section}.${item}`;

/** Whole years between DOB (YYYY-MM-DD) and the given date. */
export function ageOn(dob: string | null | undefined, on: Date = new Date()): number | null {
  if (!dob) return null;
  const [y, m, d] = dob.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  let age = on.getFullYear() - y;
  if (on.getMonth() + 1 < m || (on.getMonth() + 1 === m && on.getDate() < d)) age -= 1;
  return age;
}

/** "2026 Term 4" from a term name; falls back to the name as-is. */
export function termLabelOf(name: string | null | undefined, startDate?: string | null): string {
  const n = name || '';
  const yr = n.match(/(\d{4})/)?.[1] || startDate?.slice(0, 4);
  const tm = n.match(/term\s*(\d)/i)?.[1];
  return yr && tm ? `${yr} Term ${tm}` : n;
}
