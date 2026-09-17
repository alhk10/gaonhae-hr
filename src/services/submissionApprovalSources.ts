/**
 * Adapters that put every public payment submission that still needs matching or
 * verification behind one shape, so the superadmin dashboard can show them in a
 * single list. Each adapter only wraps existing service calls — no new logic.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  getPendingGradingSubmissions,
  findStudentMatches as findGradingMatches,
  matchGradingSubmission,
  importGradingSubmission,
  rejectGradingSubmission,
  verifyGradingSubmission,
  updateGradingSubmissionDetails,
  type PendingGradingSubmission,
} from '@/services/gradingPaymentSubmissionService';
import {
  getPendingCompetitionSubmissions,
  findCompetitionSubmissionStudentMatches,
  matchCompetitionSubmission,
  importCompetitionSubmission,
  rejectCompetitionSubmission,
  verifyCompetitionSubmission,
  updateCompetitionSubmissionDetails,
  type PendingCompetitionSubmission,
} from '@/services/competitionPaymentSubmissionService';
import {
  getPendingSeminarSubmissions,
  findSeminarSubmissionStudentMatches,
  matchSeminarSubmission,
  importSeminarSubmissionStudent,
  rejectSeminarSubmission,
  verifySeminarSubmission,
  updateSeminarSubmissionDetails,
  type PendingSeminarSubmission,
} from '@/services/seminarPaymentSubmissionService';
import {
  getSchoolFeesList,
  getSchoolFeesStudentMatches,
  matchSchoolFeesSubmission,
  verifySchoolFeesSubmission,
  rejectSchoolFeesSubmission,
  type SchoolFeesRow,
} from '@/services/schoolFeesSubmissionService';
import {
  listGuardsPurchases,
  findStudentMatches as findGuardsMatches,
  updateGuardsPurchase,
  createInvoiceForPurchase,
  setGuardsStatus,
  type GuardsPurchaseRow,
} from '@/services/guardsPurchaseService';
import { MAX_GUARDS_MATCH_SCORE, MAX_MATCH_SCORE, type MatchSubject } from '@/utils/submissionMatchConfidence';
import { rememberSchoolFeesContact, rememberStudentContact } from '@/services/studentContactService';

export type SubmissionTypeKey = 'grading' | 'competition' | 'seminar' | 'school_fees' | 'guards';

/** Candidate student for the shared match dialog. */
export interface UnifiedMatchCandidate {
  student_id: string;
  student_number: string | null;
  full_name: string;
  email: string | null;
  date_of_birth: string | null;
  branch_id: string | null;
  current_belt: string | null;
  score: number;
  reason: string | null;
}

/** One row of the merged list, whatever its source. */
export interface UnifiedSubmissionRow {
  id: string;
  type: SubmissionTypeKey;
  typeLabel: string;
  name: string;
  firstName: string;
  lastName: string;
  reference: string | null;
  email: string | null;
  dateOfBirth: string | null;
  belt: string | null;
  branchId: string | null;
  branchName: string | null;
  detail: string | null;
  amount: number;
  paymentMethod: string | null;
  verified: boolean;
  matchedStudentId: string | null;
  createdAt: string;
  proofUrl: string | null;
  extraImages: { url: string; label: string }[];
  /** True when this type creates the invoice through an explicit import action. */
  supportsImport: boolean;
  raw: unknown;
}

export interface SubmissionSourceAdapter<T = any> {
  key: SubmissionTypeKey;
  label: string;
  /** Scope keys used by the auto-match / auto-import sweeps and match history. */
  autoScope: string;
  historyScope: string;
  maxScore: number;
  queryKey: (branchId?: string) => unknown[];
  invalidateKeys: string[];
  fetch: (branchId?: string) => Promise<T[]>;
  toRow: (item: T) => UnifiedSubmissionRow;
  findMatches: (item: T) => Promise<UnifiedMatchCandidate[]>;
  match: (item: T, studentId: string, actor: string) => Promise<void>;
  verify?: (item: T, actor: string) => Promise<void>;
  importInvoice?: (item: T, actor: string) => Promise<unknown>;
  reject: (item: T, reason: string, actor: string) => Promise<void>;
  updateDetails?: (
    item: T,
    patch: {
      first_name?: string;
      last_name?: string;
      email?: string | null;
      date_of_birth?: string | null;
      current_belt?: string | null;
      branch_id?: string;
    },
  ) => Promise<void>;
}

export const subjectOfRow = (row: UnifiedSubmissionRow): MatchSubject => ({
  name: row.name,
  dateOfBirth: row.dateOfBirth,
  email: row.email,
});

const money = (v: unknown) => Number(v || 0);

/* ------------------------------- grading -------------------------------- */

const gradingAdapter: SubmissionSourceAdapter<PendingGradingSubmission> = {
  key: 'grading',
  label: 'Grading',
  autoScope: 'grading-submissions',
  historyScope: 'grading',
  maxScore: MAX_MATCH_SCORE,
  queryKey: (branchId) => ['pending-grading-submissions', branchId],
  invalidateKeys: ['pending-grading-submissions', 'pending-grading-submissions-count', 'public-grading-list'],
  fetch: (branchId) => getPendingGradingSubmissions(branchId),
  toRow: (s) => ({
    id: s.id,
    type: 'grading',
    typeLabel: 'Grading',
    name: s.student_name || `${s.first_name || ''} ${s.last_name || ''}`.trim(),
    firstName: s.first_name || '',
    lastName: s.last_name || '',
    reference: s.reference_number,
    email: s.email,
    dateOfBirth: s.date_of_birth,
    belt: s.current_belt,
    branchId: s.branch_id,
    branchName: s.branch_name || null,
    detail: [s.product_name, s.slot_label].filter(Boolean).join(' · ') || null,
    amount: money(s.amount),
    paymentMethod: s.payment_method,
    verified: s.status === 'verified' || s.status === 'paid',
    matchedStudentId: s.matched_student_id,
    createdAt: s.created_at,
    proofUrl: s.proof_url,
    extraImages: [],
    supportsImport: true,
    raw: s,
  }),
  findMatches: (s) => findGradingMatches(s.id) as Promise<UnifiedMatchCandidate[]>,
  match: async (s, studentId) => {
    await matchGradingSubmission(s.id, studentId);
    await rememberStudentContact(studentId, { email: s.email });
  },
  verify: (s, actor) => verifyGradingSubmission(s.id, actor),
  importInvoice: (s, actor) => importGradingSubmission(s.id, actor),
  reject: (s, reason, actor) => rejectGradingSubmission(s.id, reason, actor),
  updateDetails: (s, patch) => updateGradingSubmissionDetails(s.id, patch),
};

/* ----------------------------- competition ------------------------------ */

const competitionAdapter: SubmissionSourceAdapter<PendingCompetitionSubmission> = {
  key: 'competition',
  label: 'Competition',
  autoScope: 'competition-submissions',
  historyScope: 'competition',
  maxScore: MAX_MATCH_SCORE,
  queryKey: (branchId) => ['pending-competition-submissions', branchId],
  invalidateKeys: [
    'pending-competition-submissions',
    'pending-competition-submissions-count',
    'public-competition-list',
  ],
  fetch: (branchId) => getPendingCompetitionSubmissions(branchId),
  toRow: (s) => ({
    id: s.id,
    type: 'competition',
    typeLabel: 'Competition',
    name: s.student_name || `${s.first_name || ''} ${s.last_name || ''}`.trim(),
    firstName: s.first_name || '',
    lastName: s.last_name || '',
    reference: s.reference_number,
    email: s.email,
    dateOfBirth: s.date_of_birth,
    belt: s.current_belt,
    branchId: s.branch_id,
    branchName: s.branch_name || null,
    detail: (s.category_names || []).join(', ') || null,
    amount: money(s.amount),
    paymentMethod: s.payment_method,
    verified: s.status === 'verified' || s.status === 'paid',
    matchedStudentId: s.matched_student_id,
    createdAt: s.created_at,
    proofUrl: s.proof_url,
    extraImages: s.certificate_url ? [{ url: s.certificate_url, label: 'Certificate' }] : [],
    supportsImport: true,
    raw: s,
  }),
  findMatches: (s) => findCompetitionSubmissionStudentMatches(s.id) as Promise<UnifiedMatchCandidate[]>,
  match: async (s, studentId) => {
    await matchCompetitionSubmission(s.id, studentId);
    await rememberStudentContact(studentId, { email: s.email });
  },
  verify: (s, actor) => verifyCompetitionSubmission(s.id, actor),
  importInvoice: (s, actor) => importCompetitionSubmission(s.id, actor),
  reject: (s, reason, actor) => rejectCompetitionSubmission(s.id, reason, actor),
  updateDetails: (s, patch) => updateCompetitionSubmissionDetails(s.id, patch),
};

/* -------------------------------- seminar ------------------------------- */

const seminarAdapter: SubmissionSourceAdapter<PendingSeminarSubmission> = {
  key: 'seminar',
  label: 'Seminar',
  autoScope: 'seminar-submissions',
  historyScope: 'seminar',
  maxScore: MAX_MATCH_SCORE,
  queryKey: (branchId) => ['pending-seminar-submissions', branchId],
  invalidateKeys: ['pending-seminar-submissions', 'pending-seminar-submissions-count', 'public-seminar-list'],
  fetch: (branchId) => getPendingSeminarSubmissions(branchId),
  toRow: (s) => ({
    id: s.id,
    type: 'seminar',
    typeLabel: 'Seminar',
    name: s.student_name || `${s.first_name || ''} ${s.last_name || ''}`.trim(),
    firstName: s.first_name || '',
    lastName: s.last_name || '',
    reference: s.reference_number,
    email: s.email,
    dateOfBirth: s.date_of_birth,
    belt: s.current_belt,
    branchId: s.branch_id,
    branchName: s.branch_name || null,
    detail: s.package_label || null,
    amount: money(s.amount),
    paymentMethod: s.payment_method,
    verified: s.status === 'verified' || s.status === 'paid',
    matchedStudentId: s.matched_student_id,
    createdAt: s.created_at,
    proofUrl: s.proof_url,
    extraImages: [],
    supportsImport: true,
    raw: s,
  }),
  findMatches: (s) => findSeminarSubmissionStudentMatches(s.id) as Promise<UnifiedMatchCandidate[]>,
  match: async (s, studentId) => {
    await matchSeminarSubmission(s.id, studentId);
    await rememberStudentContact(studentId, { email: s.email });
  },
  verify: (s, actor) => verifySeminarSubmission(s.id, actor),
  importInvoice: (s, actor) => importSeminarSubmissionStudent(s.id, actor),
  reject: (s, reason, actor) => rejectSeminarSubmission(s.id, reason, actor),
  updateDetails: (s, patch) => updateSeminarSubmissionDetails(s.id, patch),
};

/* ------------------------------ school fees ----------------------------- */

const schoolFeesAdapter: SubmissionSourceAdapter<SchoolFeesRow> = {
  key: 'school_fees',
  label: 'School fees',
  autoScope: 'school-fees-submissions',
  historyScope: 'school_fees',
  maxScore: MAX_MATCH_SCORE,
  queryKey: () => ['school-fees-pending-approvals'],
  invalidateKeys: ['school-fees-pending-approvals', 'school-fees-list'],
  fetch: async () => {
    const rows = await getSchoolFeesList(null, null);
    // Only what still needs attention: not rejected, and no invoice yet.
    return rows.filter((r) => r.status !== 'rejected' && !r.invoice_id);
  },
  toRow: (r) => {
    const name = (r.student_name || r.contact_name || '').trim();
    const [firstName, ...rest] = name.split(/\s+/);
    return {
      id: r.id,
      type: 'school_fees',
      typeLabel: 'School fees',
      name,
      firstName: firstName || '',
      lastName: rest.join(' '),
      reference: r.reference_number,
      email: r.contact_email,
      dateOfBirth: r.contact_dob,
      belt: null,
      branchId: r.branch_id,
      branchName: r.branch_name,
      detail: (r.items || []).map((i) => i.product_name).filter(Boolean).join(', ') || r.category || null,
      amount: money(r.amount),
      paymentMethod: r.payment_method,
      verified: r.status === 'verified' || r.status === 'paid',
      matchedStudentId: r.student_id,
      createdAt: r.created_at,
      proofUrl: r.proof_url,
      extraImages: [],
      // Linking the student is what creates the school fee invoice.
      supportsImport: false,
      raw: r,
    };
  },
  findMatches: (r) => getSchoolFeesStudentMatches(r.id) as Promise<UnifiedMatchCandidate[]>,
  match: async (r, studentId, actor) => {
    await matchSchoolFeesSubmission(r.id, studentId, actor);
    await rememberSchoolFeesContact(r.id, studentId);
  },
  verify: (r, actor) => verifySchoolFeesSubmission(r.id, actor),
  reject: (r, reason, actor) => rejectSchoolFeesSubmission(r.id, reason, actor),
};

/* -------------------------------- guards -------------------------------- */

const guardsVerified = (r: GuardsPurchaseRow) => r.sale_status === 'verified' || r.sale_status === 'paid';

const guardsAdapter: SubmissionSourceAdapter<GuardsPurchaseRow> = {
  key: 'guards',
  label: 'Uniforms & guards',
  autoScope: 'guards-purchases',
  historyScope: 'guards',
  maxScore: MAX_GUARDS_MATCH_SCORE,
  queryKey: (branchId) => ['guards-purchase-approvals', branchId],
  invalidateKeys: ['guards-purchase-approvals', 'guards-purchases'],
  fetch: async (branchId) => {
    const rows = await listGuardsPurchases();
    return rows.filter((r) => {
      if (r.invoice_id) return false;
      if (r.sale_status === 'rejected' || r.sale_status === 'cancelled') return false;
      if (branchId && r.branch_id !== branchId) return false;
      return true;
    });
  },
  toRow: (r) => ({
    id: r.id,
    type: 'guards',
    typeLabel: 'Uniforms & guards',
    name: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
    firstName: r.first_name || '',
    lastName: r.last_name || '',
    reference: r.reference_number,
    email: r.email,
    dateOfBirth: r.date_of_birth,
    belt: r.current_belt,
    branchId: r.branch_id,
    branchName: null,
    detail: Array.isArray(r.items)
      ? r.items.map((i: any) => i?.name || i?.product_name).filter(Boolean).join(', ') || null
      : null,
    amount: money(r.total),
    paymentMethod: r.payment_method,
    verified: guardsVerified(r),
    matchedStudentId: r.matched_student_id,
    createdAt: r.created_at,
    proofUrl: r.proof_url,
    extraImages: [],
    supportsImport: true,
    raw: r,
  }),
  findMatches: async (r) => {
    const candidates = await findGuardsMatches(r);
    return candidates.map((c) => ({
      student_id: c.id,
      student_number: c.student_number,
      full_name: `${c.first_name || ''} ${c.last_name || ''}`.trim().toUpperCase(),
      email: c.email,
      date_of_birth: c.date_of_birth,
      branch_id: c.branch_id,
      current_belt: c.current_belt,
      score: c.score,
      reason: null,
    }));
  },
  match: async (r, studentId) => {
    await updateGuardsPurchase(r.id, { matched_student_id: studentId });
    await rememberStudentContact(studentId, { email: r.email, phone: r.phone });
    // A purchase only becomes a paid invoice once its payment is verified.
    if (guardsVerified(r)) {
      await createInvoiceForPurchase({ ...r, matched_student_id: studentId }, studentId);
    }
  },
  verify: async (r) => setGuardsStatus(r.id, 'verified'),
  importInvoice: async (r) => {
    if (!r.matched_student_id) throw new Error('Match a student first');
    return createInvoiceForPurchase(r, r.matched_student_id);
  },
  reject: async (r) => setGuardsStatus(r.id, 'rejected'),
  updateDetails: (r, patch) =>
    updateGuardsPurchase(r.id, {
      ...(patch.first_name !== undefined ? { first_name: patch.first_name.trim().toUpperCase() } : {}),
      ...(patch.last_name !== undefined ? { last_name: patch.last_name.trim().toUpperCase() } : {}),
      ...(patch.email !== undefined ? { email: patch.email } : {}),
      ...(patch.date_of_birth !== undefined ? { date_of_birth: patch.date_of_birth } : {}),
      ...(patch.current_belt !== undefined ? { current_belt: patch.current_belt } : {}),
      ...(patch.branch_id !== undefined ? { branch_id: patch.branch_id } : {}),
    } as Partial<GuardsPurchaseRow>).then(() => undefined),
};

export const SUBMISSION_SOURCES: SubmissionSourceAdapter[] = [
  gradingAdapter as SubmissionSourceAdapter,
  competitionAdapter as SubmissionSourceAdapter,
  seminarAdapter as SubmissionSourceAdapter,
  schoolFeesAdapter as SubmissionSourceAdapter,
  guardsAdapter as SubmissionSourceAdapter,
];

export const getSourceAdapter = (key: SubmissionTypeKey): SubmissionSourceAdapter =>
  SUBMISSION_SOURCES.find((s) => s.key === key)!;

/** Shared student search used by the merged match dialog. */
export const searchStudentsForMatch = async (term: string) => {
  if (term.trim().length < 2) return [];
  const like = `%${term.trim()}%`;
  const { data } = await supabase
    .from('students')
    .select('id, student_number, first_name, last_name, email, date_of_birth, branch_id, current_belt')
    .or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},student_number.ilike.${like}`)
    .limit(20);
  return data || [];
};
