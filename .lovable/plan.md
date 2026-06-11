# Competition Events: Free-Text Fee Lines

## Goal
Replace product pickers on the Competition Event admin dialog with simple free-text **Name + Amount** rows. The dialog now collects:
- One **Coaching** line (Name + Amount, required).
- Any number of **Additional / Category** lines (Name + Amount, optional, add/remove freely).

The imported invoice uses the **Competition (event) name** as the line description and the entered amounts as unit prices (treated as pre-GST). No more linkage to the Products table.

## Data model

### Migration on `public.competition_events`
- Add `coaching_label text NULL` and `coaching_amount numeric(10,2) NULL` (pre-GST).
- Add `extra_lines jsonb NOT NULL DEFAULT '[]'` — array of `{ label: string, amount: number }`.
- Keep `coaching_product_id` / category mapping table for now (nullable, ignored at write time) to preserve existing rows; new saves write only the new fields.

### Migration on `public.competition_payment_submissions`
- Add `coaching_label text`, `coaching_amount numeric(10,2)`, `extra_lines jsonb NOT NULL DEFAULT '[]'` so each submission snapshots what the user paid for at submit time (event config may change later).
- `coaching_product_id` and `category_product_ids` stay nullable for backward compatibility.

## RPC changes

### `admin_upsert_competition_event`
- New params: `p_coaching_label text`, `p_coaching_amount numeric`, `p_extra_lines jsonb`.
- Drop `p_coaching_product_id` / `p_category_product_ids` (or accept-and-ignore for safety).
- Persists the new columns.

### `get_public_competition_events`
- Return `coaching_label`, `coaching_amount`, `extra_lines` instead of product joins.

### `submit_competition_payment`
- Snapshot `coaching_label`, `coaching_amount`, `extra_lines` from the chosen event onto the new submission row.
- `amount` = `coaching_amount + sum(extra_lines.amount)` (pre-GST sum — tax computed later at import).

### `admin_import_competition_submission`
- Build invoice lines from the snapshot:
  - Line 1: `description = <event.name>`, `unit_price = sub.coaching_amount`, tax 0 unless a global tax rate is desired — for simplicity tax 0 (matches "amount entered is total before GST", no GST added). Confirmed: amount is the final figure.
  - One line per entry in `sub.extra_lines`: `description = <event.name> - <line.label>`, `unit_price = line.amount`, tax 0.
- `product_id` left NULL on each line (free-text, no product link).
- Totals recomputed from the lines.

## UI

### `CompetitionEventsSettingsDialog.tsx`
Remove the **Coaching fee product** Select and the **Category products** picker. Replace with:

1. **Coaching line** section:
   - `Name *` text input
   - `Amount *` numeric input
2. **Additional lines** section:
   - Repeatable rows: `Name`, `Amount`, trash button.
   - "Add line" button below.
3. Hydrate form from `coaching_label`, `coaching_amount`, `extra_lines` on edit; default both amounts to 0 and an empty `extra_lines` array on new.
4. Save payload sends the new fields.

### `PublicCompetitionPayment.tsx`
- Render the coaching line using `event.coaching_label` + `event.coaching_amount`.
- Render the extra lines as a checkbox list (so users can opt in/out) showing `label` + `amount`.
- Total = coaching_amount + sum of selected extra amounts.
- Submission payload changes accordingly (passes selected extra_lines snapshot and computed amount).

### Service (`competitionPaymentSubmissionService.ts`)
- Update `CompetitionEvent`, upsert input, and submit input types to use the new shape.
- Drop product-fetching joins (`product_id` arrays) from the public list query.

## Out of scope
- Existing verified invoices and historical submissions stay as-is.
- No retroactive backfill — old events without `coaching_amount` show 0 and need re-entry by admin.
- No accounting/product-stat integration for these free-text lines.
