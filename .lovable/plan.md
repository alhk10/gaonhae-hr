# Categories & Other on Competition Events

Three coordinated changes to treat the configurable extra lines as **Categories** and introduce a separate **Other** group for non-category fees (e.g. accompanying parent).

## 1. Data model (no schema migration)

Extra lines remain in `competition_events.extra_lines` and `competition_payment_submissions.extra_lines` (JSONB). Add an optional `kind` field per entry:

- `kind: 'category'` (default when missing → backfill on read)
- `kind: 'other'`

Existing rows without `kind` are treated as `'category'`, so historical data keeps working.

## 2. Admin – `CompetitionEventsSettingsDialog.tsx` (/grading-list → Competitions → Events)

- Rename the existing **Additional lines** block to **Categories**. Keep its current UI: preset dropdown, amount, Compulsory toggle, Add/remove, "Add new category…" sub-dialog.
- Add a new **Other** block directly below Categories, mirroring the same layout (Name dropdown from the same preset list, Amount, Compulsory checkbox, Add/remove). Items added here are saved with `kind: 'other'`.
- On save, write the combined array back to `extra_lines`, preserving each item's `kind`.
- The event card summary continues counting all extra lines.

## 3. Public form – `PublicCompetitionPayment.tsx` (/comps)

- Split `selectedEvent.extra_lines` into two groups by `kind`.
- Render the first group under the heading **Categories** (currently "Additional Items"); render the second group under **Other** with the same row layout and selection behaviour. Weight-required logic (Individual Kyorugi etc.) keeps working in both groups.
- Submission payload still sends all selected lines through `extra_lines`, each carrying its `kind` and any `weight_kg`.

## 4. Grading list Competitions tab – `PublicGradingList.tsx` + service

The Categories column currently reads `category_names` derived from `category_product_ids`, which is empty for events configured via extra-line presets — hence the dashes in the screenshot.

- Update `get_public_competition_list` RPC to also return `extra_categories text[]` = labels from the submission's `extra_lines` where `kind = 'category'` (or missing).
- In the service, expose `extra_categories` on `PublicCompetitionListRow` and prefer it when `category_names` is empty.
- In the table, flatMap rows by `extra_categories` when present so each selected category gets its own row (matching today's behaviour for product-based categories). The displayed label is the raw preset name.
- "Other" lines do NOT appear in the Categories column — they remain visible only on the invoice/email side.

## Technical notes

- `CompetitionExtraLine` type in `competitionPaymentSubmissionService.ts` gains `kind?: 'category' | 'other'`.
- `submitCompetitionPayment` keeps `categories: extra_lines.filter(kind!=='other').map(label)` for the confirmation email.
- One migration only: redefine `get_public_competition_list` to add `extra_categories text[]`. No table changes, no new GRANTs.
- No changes to seminars, grading, or guards flows.
