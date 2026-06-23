## Goal
Add a missing "Categories" editor to the Edit competition submission dialog (Competitions tab on `/grading-list`), so admins can change which categories a competitor is registered for after submission.

## Where
`src/components/grading-list/EditCompetitionSubmissionDialog.tsx`

## What it edits
Two underlying data points on `competition_payment_submissions`:
1. `category_product_ids` (uuid[]) — categories tied to the event's official category products (defined per event in `competition_event_categories`).
2. `extra_lines` (jsonb) — ad-hoc/extra category entries with `{ label, amount, kind: 'category' }` (kept alongside `kind: 'other'` lines, which we leave untouched).

## UI changes
Insert a new "Categories" section between the Poomsae 2 row and the existing Files section:

- Heading: "Categories" (text-xs font-semibold), same density as rest of dialog.
- **Event categories** (only shown when the submission has an `event_id`):
  - Fetch the event via existing `getPublicCompetitionEvents()` and find the matching event; render its `categories` array as a grid of checkboxes (label = category product name, with `$amount` to the right).
  - Pre-check whatever is in `category_product_ids`.
  - Show a small "Total selected: $X.XX" line under the grid.
  - If no `event_id` on the row, show a muted hint: "No event linked — only extra categories editable."
- **Extra categories** (rows from `extra_lines` where `kind === 'category'`):
  - Editable list: each row = Label input (h-7 text-xs) + Amount input (h-7 text-xs, number, step 0.01) + trash button.
  - "Add extra category" button (size sm, variant outline) appends a blank row.
  - `extra_lines` entries with `kind === 'other'` are preserved as-is (not shown, not modified).

## Save flow
On "Save changes":
1. Existing `adminPatchCompetitionSubmission(...)` call — extend the patch with the recomputed `extra_lines` JSON (merging the edited category rows with the untouched `other` rows).
2. After that resolves, if `event_id` is present and the checked set changed, call existing `updateCompetitionSubmissionCategories(submissionId, selectedProductIds)`.
3. `refetch()` then `onSaved?.()` and close as today.

Error handling: any thrown error → existing `toast.error` path. No partial-save toasts.

## State additions
- `selectedCategoryIds: string[]`
- `extraCategoryLines: Array<{ label: string; amount: number }>`
- Reset both inside the existing `useEffect([row])` block from `row.category_product_ids` and `row.extra_lines`.

## Data fetching
- Reuse existing `getPublicCompetitionEvents` via `useQuery({ queryKey: ['public-competition-events'] })` with `staleTime: 5 * 60 * 1000`.
- Derive `eventCategoryOptions` via `useMemo` from the loaded event matching `row.event_id`.

## Out of scope
- No DB / migration / RPC changes — `admin_update_competition_submission_categories` and `extra_lines` writes via row update already exist and are used today.
- No changes to `/comps` public form, Seminar dialog, or list/print views.
- No automatic recompute of `amount` (admin already edits Amount manually in the same dialog); we just show the selected-category subtotal as guidance.

## Files touched
- `src/components/grading-list/EditCompetitionSubmissionDialog.tsx` (only).
