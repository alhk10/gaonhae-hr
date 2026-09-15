# Remember manual matches so the same person matches automatically next time

## What happens today

A manual match is only remembered when staff overrule the top suggestion. If there was no suggestion at all — the usual case for the unmatched rows in the approvals list — nothing is stored, so the next payment from the same person arrives unmatched again.

Even when it is stored, the memory only fires if the new submission's name, birth date and email are all identical to the earlier one, and only if the suggestion list already contains that account.

## What will change

1. **Every manual match is remembered**, not just corrections. Picking a student by hand stores "these details belong to this account", plus the rejected account when staff overruled a suggestion.
2. **Looser recall.** Alongside the full name + birth date + email key, the system also stores and looks up shorter keys: name + birth date, email on its own, and mobile on its own. A later payment that matches any one of those is recognised.
3. **The remembered account always wins**, even when the usual search would not have surfaced it: if a remembered account exists for the person, the row is linked to it directly instead of relying on the suggestion list.
4. **The details are learnt onto the account** the same way alternate emails already are: the email and mobile used on the form are added to the matched student as additional known contacts, so plain searching finds them too.
5. Applies across grading, competitions, events, uniforms and guards, and school fees — all five approval screens behave the same.

Nothing changes for verification or invoicing: an invoice still needs both a verified payment and a matched student.

## Technical notes

- `submissionMatchConfidence.ts`: replace `buildIdentityKey` with `buildIdentityKeys(subject)` returning ordered keys — `full` (name|dob|email), `name_dob`, `email`, `phone` — each prefixed with its kind. Keep a `buildIdentityKey` alias for the full key.
- `MatchSubject` gains `phone`.
- `submissionMatchHistoryService.ts`:
  - `rememberMatchCorrection` → `rememberMatch({ subject, preferredStudentId, blockedStudentId?, actor })`, inserting/upserting one override row per identity key (unique index extended to `(identity_key, COALESCE(blocked_student_id, zero-uuid))`, already in place).
  - `getOverrideGuards` queries `identity_key = ANY(keys)` and resolves the preferred student by key precedence (full > name_dob > email > phone), unioning blocked ids.
- Approval screens (`PublicGradingSubmissionApprovals`, `PublicCompetitionSubmissionApprovals`, `PublicSeminarSubmissionApprovals`, `PublicGuardsPurchaseApprovals`, school-fees path): call `rememberMatch` on every manual match; include phone in `subjectOf`.
- `submissionAutoMatch.ts`: when `guards.preferredStudentId` is set and absent from `fetchMatches` results, link to it directly via a new `matchPreferred` fallback (uses the existing per-scope match call) and record the event with method `auto` and note `remembered`.
- Reuse the existing `_remember_student_email` RPC after a manual match; add an equivalent for mobile only if a student alt-phone column exists — otherwise skip point 4 for phone and keep email only.
- Migration: none required beyond the existing tables, unless the alt-phone column is added.
