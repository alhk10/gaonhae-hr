## Goal
On `/grading-list`, allow unlocked admins (either password) to set each registration's **Result** inline and only show the certificate download once the result qualifies. Selection checkboxes also become result-driven.

## Database / RPC
Update the `get_public_grading_list` SQL function to also return:
- `registration_id uuid` (gr.id, NULL for submission rows)
- `result text` (gr.result, NULL for submission rows)

No schema change to `grading_registrations` — `result` already exists. Allowed values used by the UI: `pass`, `fail`, `double`, `confirmed` (free-text column, so no constraint needed; existing scorecard auto-compute still writes `pass`/`fail`).

A small migration creates the updated SQL function and an `admin_update_grading_result(p_registration_id uuid, p_result text)` SECURITY DEFINER function so the unauthenticated public page can write the result (mirroring the existing `admin_update_grading_submission_slot` pattern). It also sets `result_manual_override = true` so the auto-compute doesn't overwrite it.

## Frontend (`src/pages/public/PublicGradingList.tsx`)
1. **Types/service** — extend `PublicGradingListRow` with `registration_id: string | null` and `result: string | null`; add `adminUpdateGradingResult(registration_id, result)` in `gradingPaymentSubmissionService.ts`.

2. **Result dropdown column** (registration rows only, in editMode under either password):
   - New `<TableHead>` "Result" placed immediately before the inline action buttons.
   - Compact Select with options `Double / Pass / Fail / Confirmed` (lowercase values). Empty = unset.
   - `onValueChange` → calls service → optimistic invalidate of `public-grading-list`.
   - For submission rows render `—`.

3. **Certificate button gating**:
   - Show the inline `<Award>` button only when `r.result === 'pass'` OR `r.result === 'double'`.
   - When `result === 'double'`, render two `<Award>` buttons side-by-side:
     - Button 1 → certificate for `current_belt → target_belt` (current behaviour).
     - Button 2 → certificate for `target_belt → nextBelt(target_belt)` using the existing `beltLevels` helper to look up the next belt. Disabled with tooltip "No next belt" if none.
   - `rowToCertInput` gains an optional belt override so the second button can pass the next belt as `beltAchieved`.

4. **Checkbox gating** — change `eligibleSlotRows` and the per-row checkbox condition from `r.source==='registration' && r.grading_date && r.current_belt` to additionally require `r.result === 'pass' || r.result === 'double'`. Already on the row; no layout move needed.

5. **Bulk certificate selection** — for `result==='double'` selections, emit two `GradingCertificateInput` entries (current→target and target→next) into the bulk PDF generator.

6. **PDF (left/right column layout)** — add the Result column to the per-slot table body. No structural changes to the page-splitting logic; it already remeasures from `body` rows.

## Out of scope
- No change to the unlock UI itself (both passwords already grant `editMode`; `canDelete` stays full-only and continues to control trash + summary PDF only).
- No change to scorecard auto-compute or `result_manual_override` semantics beyond the new manual write path.

## Technical notes
```text
Row (registration, editMode):
[☐?] # Branch Student Belt Status [Amount] [Proof] [Result ▼] [✓] [✗] [✎] [🗑] [🏅] [🏅²]
                                                                            └ only when result ∈ {pass,double}
                                                                              two icons only when result==='double'
```

Next-belt lookup uses `src/constants/beltLevels.ts` (`getNextBelt(belt)` or equivalent — verified to exist in the project).
