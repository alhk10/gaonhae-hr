
## Goal

Make `/comps` and the `/grading-list` Competitions tab support any competition: admin defines events (with coaching fee + categories + fees + required-field toggles + indemnity text) in a settings dialog; public form dynamically asks for only what each event needs.

## 1. Data model (new tables)

**`competition_events`** — one row per real-world competition.
- `name`, `is_active`, `display_order`
- `coaching_product_id` (uuid → products) — single coaching fee for the event
- `indemnity_clause` (text) — when non-empty, signature is required automatically
- `require_indemnity_form` (bool), `require_passport` (bool), `require_photo` (bool) — independent toggles
- `created_at`, `updated_at`
- Gender is always required (not toggleable) per your answer.

**`competition_event_categories`** — categories belonging to an event.
- `event_id` (fk), `product_id` (uuid → products), `display_order`, `is_active`
- Unique (event_id, product_id)

RLS: public `SELECT` on active rows (needed by `/comps`); superadmin full write. Grants for anon SELECT + authenticated/service_role full.

**`competition_payment_submissions` additions:**
- `event_id` uuid (nullable for legacy rows)
- `gender` text
- `signature_url`, `indemnity_form_url`, `passport_url`, `photo_url` (all text/nullable)

## 2. Settings dialog (`/grading-list` Competitions tab)

Add a `Settings` (gear) button next to existing tab controls (superadmin only). Opens a dialog:

- Left pane: list of events with active/inactive toggle, edit, delete (delete blocked if submissions reference event — show count).
- Right pane (edit/create): name, active, coaching product picker (single), category products picker (multi, ordered), indemnity clause textarea, three checkboxes (indemnity form, passport, photo required). Signature requirement is shown as auto-derived from indemnity clause presence ("Signature will be required because clause is set").
- Product pickers query existing `products` (filtered to active). No new products created here — admins pick from existing competition-type products.

## 3. `/comps` form changes

- Top of form: **Event selector** (active events only). All downstream fields depend on selection.
- After belt: **Gender** select (male/female/other) — always shown.
- Coaching fee row: shows only the event's coaching product (auto-selected, read-only or single-option).
- Categories: only categories belonging to the selected event.
- Conditional blocks below proof upload:
  - If `indemnity_clause` non-empty → render clause text in scrollable box + canvas signature pad (reuse `/register` pattern) → uploads as PNG to `payment-proofs` bucket on submit.
  - If `require_indemnity_form` → file upload (image/pdf).
  - If `require_passport` → file upload (image/pdf).
  - If `require_photo` → image upload.
- Submit validation requires every enabled field.

## 4. Uploads

All new files go to existing `payment-proofs` bucket, path `public-comps/{branch_id}/{ts}_{NAME}_{kind}.{ext}` where kind ∈ `signature|indemnity|passport|photo`. Reuse the existing signed-URL pattern in `competitionPaymentSubmissionService.submitCompetitionPayment`.

## 5. `/grading-list` Competitions tab display

Add a compact icon strip column (between Proof and Status):
- Pen icon (signature), File icon (indemnity), IdCard icon (passport), Image icon (photo). Each rendered when the underlying URL exists; click opens preview (reuse `SignedImagePreview`/`SignedMedia`). Missing-but-required show muted/grey with tooltip "Missing".
- Add Gender as a small text under student name (e.g. `M` / `F`).

No new top-level columns — keeps the per-category-row layout from previous change intact.

## 6. Service / RPC changes

`competitionPaymentSubmissionService.ts`:
- `getActiveCompetitionEvents()` → public RPC returning events + their categories + coaching product (joined names/prices).
- Extend `SubmitCompetitionPaymentInput` with `event_id`, `gender`, optional `signature_data_url`, `indemnity_form_file`, `passport_file`, `photo_file`.
- `submitCompetitionPayment` uploads conditionally, then passes new fields into `submit_competition_payment` RPC.
- Admin CRUD RPCs: `admin_upsert_competition_event`, `admin_delete_competition_event`, `admin_set_competition_event_active`. All `SECURITY DEFINER`, superadmin-checked.

## 7. Out of scope

- No changes to `/pay` (grading), Seminars, Guards tabs.
- No new product creation flow inside settings (pick existing products only).
- No changes to invoice import logic beyond passing through new uploaded URLs into notes/metadata.

## Technical summary

Files touched:
- `supabase/migrations/...` — 2 migrations (tables + columns + grants + RLS + RPCs).
- `src/services/competitionPaymentSubmissionService.ts` — extended types, new event fetch + admin CRUD wrappers.
- `src/pages/public/PublicCompetitionPayment.tsx` — event selector, gender, conditional upload/signature blocks.
- `src/components/grading-list/CompetitionEventsSettingsDialog.tsx` — new dialog component.
- `src/pages/public/PublicGradingList.tsx` — Settings button (superadmin), per-row icon indicators, gender display.
- Reuse signature canvas pattern from `/register` (`StudentRegistration.tsx`).
