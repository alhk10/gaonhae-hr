/**
 * Shared confidence helpers for submission → student matching.
 *
 * Scores come from different scorers (SQL fuzzy match for grading/competition/
 * seminar, client-side scoring for guards purchases), so each caller passes the
 * maximum possible score for its scorer and we normalise to a 0-100 confidence.
 *
 * On top of the score there is a hard contradiction guard: even a high score is
 * never auto-linked when the submission and the student clearly describe two
 * different people (different date of birth, or names that are not the same
 * person). Those rows are left for staff instead.
 */

/**
 * Max score of the SQL scorer: name .6 + DOB .5 + email .15 + branch .1.
 * Email is deliberately weak — families share one address between siblings —
 * and scores nothing at all when several students share it.
 */
export const MAX_MATCH_SCORE = 1.35;

/** Max score of the guards purchase client-side scorer (email worth 1 point). */
export const MAX_GUARDS_MATCH_SCORE = 13;

/** Auto-link when the best match is at least this confident. */
export const AUTO_MATCH_THRESHOLD = 77;

/** ...and the runner-up is at least this many points behind. */
export const AUTO_MATCH_GAP = 10;

/** Names below this similarity are never the same person automatically. */
export const NAME_SIMILARITY_FLOOR = 0.6;

export const toConfidence = (score: number | string | null | undefined, maxScore = MAX_MATCH_SCORE): number => {
  const n = typeof score === 'string' ? parseFloat(score) : Number(score ?? 0);
  if (!Number.isFinite(n) || maxScore <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((n / maxScore) * 100)));
};

const normaliseName = (value?: string | null): string[] =>
  (value || '')
    .toUpperCase()
    .replace(/[^A-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

/** 0-1 token overlap, tolerant of extra middle names and swapped order. */
export const nameSimilarity = (a?: string | null, b?: string | null): number => {
  const left = normaliseName(a);
  const right = normaliseName(b);
  if (!left.length || !right.length) return 0;
  const shared = left.filter((t) => right.includes(t)).length;
  return shared / Math.min(left.length, right.length);
};

const normaliseDate = (value?: string | null): string | null => {
  const v = (value || '').trim();
  return v ? v.slice(0, 10) : null;
};

export interface MatchSubject {
  name?: string | null;
  dateOfBirth?: string | null;
  email?: string | null;
  phone?: string | null;
}

/** Digits only, last 8, so +65 / spaces / dashes all compare equal. */
export const normalisePhone = (value?: string | null): string => {
  const digits = (value || '').replace(/\D/g, '');
  return digits.length >= 8 ? digits.slice(-8) : '';
};

export interface MatchCandidateIdentity {
  student_id?: string | null;
  id?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  date_of_birth?: string | null;
  email?: string | null;
}

export const candidateStudentId = (candidate: MatchCandidateIdentity): string =>
  String(candidate.student_id || candidate.id || '');

/**
 * Returns a plain-English reason when the pairing must not be auto-linked,
 * or null when nothing contradicts.
 */
/** Whole-day difference between two date-only strings, or null when not comparable. */
export const dateOnlyDayDelta = (
  a?: string | null,
  b?: string | null,
): number | null => {
  const na = normaliseDate(a);
  const nb = normaliseDate(b);
  if (!na || !nb) return null;
  const [ya, ma, da] = na.split('-').map(Number);
  const [yb, mb, db] = nb.split('-').map(Number);
  const ta = Date.UTC(ya, ma - 1, da);
  const tb = Date.UTC(yb, mb - 1, db);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return null;
  return Math.round((ta - tb) / 86400000);
};

export const matchContradiction = (
  subject: MatchSubject | null | undefined,
  candidate: MatchCandidateIdentity,
): string | null => {
  if (!subject) return null;

  const candidateName =
    candidate.full_name || `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim();
  const nameAgrees =
    !!subject.name &&
    !!candidateName &&
    nameSimilarity(subject.name, candidateName) >= NAME_SIMILARITY_FLOOR;

  const subDob = normaliseDate(subject.dateOfBirth);
  const candDob = normaliseDate(candidate.date_of_birth);
  if (subDob && candDob && subDob !== candDob) {
    const delta = dateOnlyDayDelta(subDob, candDob);
    // Legacy records saved a day early; tolerate a one-day drift when the name agrees.
    const oneDayDrift = delta !== null && Math.abs(delta) === 1 && nameAgrees;
    if (!oneDayDrift) return 'date of birth differs';
  }

  if (subject.name && candidateName && !nameAgrees) return 'name differs';

  return null;
};


/**
 * True only when the submitted name clearly matches the candidate and nothing
 * else contradicts. A shared family email or mobile is never enough on its own,
 * so siblings are always left for staff to confirm.
 */
/**
 * Guard for an account staff already chose for this exact person. The
 * remembered rule is keyed on the submitted name plus birth date, so a sibling
 * can never recall it; the stored name may legitimately differ from the student
 * record (e.g. "Chan Jia Lok" saved as "Jordan Chan"), so only a conflicting
 * birth date blocks reuse.
 */
export const preferredAgrees = (
  subject: MatchSubject | null | undefined,
  candidate: MatchCandidateIdentity,
): boolean => {
  if (!subject) return false;
  const subDob = normaliseDate(subject.dateOfBirth);
  const candDob = normaliseDate(candidate.date_of_birth);
  if (subDob && candDob && subDob !== candDob) {
    const delta = dateOnlyDayDelta(subDob, candDob);
    // Legacy records saved a day early; tolerate a one-day drift.
    if (!(delta !== null && Math.abs(delta) === 1)) return false;
  }
  return true;
};

export const personAgrees = (
  subject: MatchSubject | null | undefined,
  candidate: MatchCandidateIdentity,
): boolean => {
  if (!subject) return false;
  const candidateName =
    candidate.full_name || `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim();
  if (!subject.name || !candidateName) return false;
  if (nameSimilarity(subject.name, candidateName) < NAME_SIMILARITY_FLOOR) return false;
  return matchContradiction(subject, candidate) === null;
};

/** Normalised key identifying the person behind a submission (name|dob|email). */
export const buildIdentityKey = (subject: MatchSubject): string =>
  [
    normaliseName(subject.name).join(' '),
    normaliseDate(subject.dateOfBirth) || '',
    (subject.email || '').trim().toLowerCase(),
  ].join('|');

/**
 * Keys the submission can be recognised by later, strongest first:
 * full details, name + birth date, email alone, mobile alone.
 */
/**
 * Only the keys that identify a person, not a household: email and mobile are
 * routinely shared between siblings, so they can never be trusted on their own.
 */
export const isStrongIdentityKey = (key: string): boolean =>
  key.startsWith('full:') || key.startsWith('nd:');

export const buildIdentityKeys = (subject: MatchSubject): string[] => {
  const name = normaliseName(subject.name).join(' ');
  const dob = normaliseDate(subject.dateOfBirth) || '';
  const email = (subject.email || '').trim().toLowerCase();
  const phone = normalisePhone(subject.phone);

  const keys: string[] = [];
  if (name && dob && email) keys.push(`full:${name}|${dob}|${email}`);
  if (name && dob) keys.push(`nd:${name}|${dob}`);
  // Email and mobile alone identify a household, not a person — never keyed on.
  void phone;
  return keys;
};

export interface AutoMatchGuardOptions {
  maxScore?: number;
  /** Details of the person who submitted, used for the contradiction guard. */
  subject?: MatchSubject | null;
  /** Students staff have already rejected for this person. */
  blockedStudentIds?: string[];
  /** Student staff previously chose for this person — always wins. */
  preferredStudentId?: string | null;
  /**
   * True when the remembered account was only recalled through a shared detail
   * (email or mobile). Siblings share those, so the name/birth date guard still
   * applies before the remembered account is used.
   */
  preferredIsWeak?: boolean;
}

/**
 * Pick the single match that is safe to auto-link, or null when the top match
 * isn't confident enough, a runner-up is too close to call, or the top match
 * contradicts the submitted details.
 */
export const pickAutoMatch = <T extends { score: number | string | null }>(
  matches: T[] | null | undefined,
  maxScoreOrOptions?: number | AutoMatchGuardOptions,
  maybeOptions?: AutoMatchGuardOptions,
): { match: T; confidence: number } | null => {
  const options: AutoMatchGuardOptions =
    typeof maxScoreOrOptions === 'object' && maxScoreOrOptions !== null
      ? maxScoreOrOptions
      : { ...(maybeOptions || {}), maxScore: (maxScoreOrOptions as number) ?? maybeOptions?.maxScore };
  const maxScore = options.maxScore ?? MAX_MATCH_SCORE;

  if (!matches || matches.length === 0) return null;

  const blocked = new Set((options.blockedStudentIds || []).filter(Boolean));
  const usable = matches.filter((m) => !blocked.has(candidateStudentId(m as MatchCandidateIdentity)));
  if (!usable.length) return null;

  if (options.preferredStudentId) {
    const preferred = usable.find(
      (m) => candidateStudentId(m as MatchCandidateIdentity) === options.preferredStudentId,
    );
    if (preferred && personAgrees(options.subject, preferred as MatchCandidateIdentity)) {
      return { match: preferred, confidence: toConfidence(preferred.score, maxScore) };
    }
  }

  const sorted = [...usable].sort((a, b) => toConfidence(b.score, maxScore) - toConfidence(a.score, maxScore));
  const top = toConfidence(sorted[0].score, maxScore);
  if (top < AUTO_MATCH_THRESHOLD) return null;
  const second = sorted[1] ? toConfidence(sorted[1].score, maxScore) : 0;
  if (top - second < AUTO_MATCH_GAP) return null;
  if (!personAgrees(options.subject, sorted[0] as MatchCandidateIdentity)) return null;
  return { match: sorted[0], confidence: top };
};
