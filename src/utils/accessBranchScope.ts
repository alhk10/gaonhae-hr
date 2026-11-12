/**
 * Branches the current /access session may change settings for.
 * All-branch password (or no /access session, e.g. superadmin pages) => null (no limit).
 */
export const accessSettingsBranchIds = (): string[] | null => {
  try {
    if (sessionStorage.getItem('guards_list_all_branch_v1') === '1') return null;
    const raw = sessionStorage.getItem('guards_list_allowed_branches_v1');
    if (raw) { const l = JSON.parse(raw); if (Array.isArray(l) && l.length) return l; }
    const one = sessionStorage.getItem('guards_list_locked_branch_v1');
    return one ? [one] : null;
  } catch { return null; }
};

export const filterSettingsBranches = <T,>(branches: T[], allowed: string[] | null = accessSettingsBranchIds()): T[] =>
  allowed ? branches.filter((b: any) => allowed.includes(b.branch_id || b.id)) : branches;

/** /access password for server-side settings checks (superadmin pages send null and rely on sign-in). */
export const accessPassword = (): string | null => {
  try { return sessionStorage.getItem('access_pw_v1') || null; } catch { return null; }
};

/** True when the restrictions that apply to every branch may be edited here. */
export const canEditCompanyWideSettings = (): boolean => accessSettingsBranchIds() === null;
