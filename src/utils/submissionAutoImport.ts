/**
 * Shared "import once verified and matched" behaviour for public submission
 * approvals (grading, competitions, events/seminars, uniforms & guards and
 * school fees).
 *
 * The database import functions already refuse to run twice and refuse to run
 * on an unmatched submission, so the client simply attempts the import and
 * treats those refusals as a normal no-op.
 */

/** Errors that just mean "not ready yet" or "already done" — never surfaced. */
const BENIGN_PATTERNS = [
  'already imported',
  'already matched',
  'already has an invoice',
  'already exists',
  'must be matched',
  'not matched',
  'matched to a student first',
];

export const isBenignAutoImportError = (message?: string | null): boolean => {
  const m = (message || '').toLowerCase();
  return BENIGN_PATTERNS.some((p) => m.includes(p));
};

export interface AutoImportOutcome {
  imported: boolean;
  error?: string;
}

/**
 * Attempt an import. Resolves with `imported: false` when the submission was
 * not ready (or was already imported), and with an `error` only for real
 * failures worth showing to staff.
 */
export const tryAutoImport = async (run: () => Promise<unknown>): Promise<AutoImportOutcome> => {
  try {
    await run();
    return { imported: true };
  } catch (e: any) {
    const message = e?.message || String(e);
    if (isBenignAutoImportError(message)) return { imported: false };
    return { imported: false, error: message };
  }
};

/** Rows already attempted this session, keyed by surface, so we never loop. */
const attempted = new Map<string, Set<string>>();

const scopeSet = (scope: string): Set<string> => {
  let s = attempted.get(scope);
  if (!s) {
    s = new Set<string>();
    attempted.set(scope, s);
  }
  return s;
};

export const clearAutoImportAttempts = (scope: string): void => {
  attempted.delete(scope);
};

export interface SweepOptions<T> {
  /** Unique id of the row. */
  getId: (row: T) => string;
  /** True when the row is both payment-verified and matched to a student. */
  isReady: (row: T) => boolean;
  /** Performs the import for one row. */
  run: (row: T) => Promise<unknown>;
}

export interface SweepResult {
  importedIds: string[];
  errors: Record<string, string>;
}

/**
 * Import every row that is verified + matched and has not been attempted yet
 * in this session.
 */
export const runAutoImportSweep = async <T>(
  scope: string,
  rows: T[],
  opts: SweepOptions<T>,
): Promise<SweepResult> => {
  const seen = scopeSet(scope);
  const result: SweepResult = { importedIds: [], errors: {} };

  for (const row of rows) {
    const id = opts.getId(row);
    if (!id || seen.has(id) || !opts.isReady(row)) continue;
    seen.add(id);
    const outcome = await tryAutoImport(() => opts.run(row));
    if (outcome.imported) result.importedIds.push(id);
    else if (outcome.error) result.errors[id] = outcome.error;
  }

  return result;
};
