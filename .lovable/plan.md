## Competitions tab — new columns and inline editing

Rework the `CompetitionsTab` on `/grading-list` so it matches the high-density layout/style of the Grading table (compact `h-7`, `text-[11px]`, table with overflow-x).

### Column order
1. Branch
2. Student
3. Belt
4. Cert (thumbnail — click to open dialog)
5. Categories (existing badges)
6. Status (existing badge)
7. Amount (right-aligned, formatted)
8. Payment Proof (thumbnail — click to open dialog)
9. Poomsae 1 (inline dropdown)
10. Poomsae 2 (inline dropdown)
11. Delete (when `canDelete`)

Coaching column is removed.

### Thumbnails
- Reuse `SignedImage` (already imported) at ~`h-10 w-10 object-cover rounded border cursor-pointer`.
- Clicking either thumbnail opens a shared image-preview `<Dialog>` rendering the full image (signed URL via `SignedImage`).
- Show `—` when the URL is null.

### Poomsae dropdowns
Options (same list for both, plus a clear "—" option):
Introductory Poomsae, Preliminary Poomsae, Taegeuk 1–8, Koryo, Keumgang, Taebaek, Pyongwon, Sipjin, Jitae, Chonkwon, Hansu.

- Use shadcn `<Select>` with compact trigger (`h-7 text-[11px]`).
- On change, call the new admin RPC and invalidate `['public-competition-list']`.
- Always editable (no time lock; this mirrors the Remark column behavior, not Result).

### Database migration
- `ALTER TABLE public.competition_payment_submissions ADD COLUMN poomsae_1 text, ADD COLUMN poomsae_2 text;`
- New SECURITY DEFINER RPC `admin_update_competition_poomsae(p_id uuid, p_poomsae_1 text, p_poomsae_2 text)` (grants to anon/authenticated, mirrors existing `admin_update_competition_submission_categories` pattern). Empty string → NULL.
- Recreate `get_public_competition_list` to also return `poomsae_1` and `poomsae_2` (existing return already includes `amount` and `proof_url`).

### Service (`competitionPaymentSubmissionService.ts`)
- Extend `PublicCompetitionListRow` with `poomsae_1: string | null; poomsae_2: string | null;`.
- Add `updateCompetitionPoomsae(id, poomsae_1, poomsae_2)` wrapping the new RPC.

### Out of scope
- No change to the public `/comps` registration form (only post-submission admin editing).
- No change to Grading, Seminars, or Guards tabs.
- No change to existing certificate/proof upload/sign-url flow.
