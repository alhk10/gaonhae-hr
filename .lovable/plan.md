
# Indemnity form: downloadable template + reupload

## Goal
Let admins attach a fillable indemnity PDF to an event. On the public payment form, show a prominent preamble that lists what must be downloaded, filled, and reuploaded, with a one-click Download button next to (and above) the Indemnity Form upload field.

## Scope clarification
The indemnity / required-uploads feature currently exists only on **Competition** events (`competition_events` + `competition_payment_submissions`). `grading_payment_submissions` and `seminar_payment_submissions` have **no** indemnity/passport/photo columns at all.

- **Phase 1 (this plan):** Implement fully for Competition, where everything is already wired.
- **Phase 2 (follow-up, not in this plan):** Replicate the indemnity/required-uploads schema + UI for Grading and Seminar. That's a meaningfully larger build (new columns, RPCs, public-page sections) and should be its own task.

## Phase 1 — Competition

### 1. Database (migration)
Add to `public.competition_events`:
- `indemnity_template_url text null` — signed/public URL of the uploaded PDF template
- `indemnity_template_name text null` — original filename for the download button label

Update the existing `admin_upsert_competition_event` RPC signature to accept and persist the two new params (`p_indemnity_template_url`, `p_indemnity_template_name`).

No new bucket — reuse `payment-proofs` under path `public-comps/{branch_id}/templates/{ts}_indemnity.pdf` with a long-lived signed URL (same pattern as existing uploads).

### 2. Admin dialog — `src/components/grading-list/CompetitionEventsSettingsDialog.tsx`
In the "Required uploads" section (lines 360–392), when **Indemnity form upload** is checked, show a sub-control:
- File input restricted to `application/pdf`
- "Upload template PDF" button → uploads to `payment-proofs`, stores signed URL in `form.indemnity_template_url`, filename in `form.indemnity_template_name`
- If a template already exists: show filename, a small Download link, and a Replace / Remove action
- Persist via the updated RPC

Helper text: "Optional. If provided, the public form shows a download button so participants can print, sign, and reupload."

### 3. Public page — `src/pages/public/PublicCompetitionPayment.tsx`
Improve UI usability by introducing a single **"Documents required" preamble card** that renders above the upload fields whenever any of `require_indemnity_form / require_passport / require_photo` is true. It will contain:

- Heading: "Before you submit"
- A short instruction list, dynamically built from which uploads are required, e.g.:
  1. Download the Indemnity Form, print it, fill it in, sign it, and reupload below. *(only if a template URL exists; otherwise: "Download, complete and sign the indemnity form, then reupload below.")*
  2. Prepare a clear photo of the participant's passport / NRIC.
  3. Prepare a recent participant photo.
- A primary **Download Indemnity Form (PDF)** button (uses `indemnity_template_url`, opens in a new tab, `download` attribute with `indemnity_template_name`). Hidden if no template uploaded.
- Tip line: "Accepted formats: PDF, JPG, PNG (max 15 MB)."

Then keep the existing upload fields (lines 578–598), but:
- Reorder so Indemnity is first, Passport second, Photo third (matches the instruction list).
- Add a small inline "Download form" link next to the Indemnity upload label for users who scroll past the preamble.
- Tighten labels: "Indemnity Form Upload" → "Upload signed Indemnity Form".

No changes to submission service beyond passing through; the existing `indemnity_form_url` flow stays intact.

### 4. Validation & errors
- Admin: reject non-PDF; cap at 10 MB; show toast errors with the real Supabase message (same pattern just introduced for claims).
- Public: existing gate (`indemnityFormFile` required when `require_indemnity_form`) is unchanged.

## Out of scope
- Grading and Seminar indemnity (needs new columns and RPCs — separate plan).
- Auto-filling participant name into the PDF (would need PDF form-field merging).
- E-signing inside the browser instead of print+reupload.

## Files touched (Phase 1)
- New migration on `competition_events` + updated `admin_upsert_competition_event` RPC
- `src/components/grading-list/CompetitionEventsSettingsDialog.tsx`
- `src/services/competitionPaymentSubmissionService.ts` (pass new fields through upsert)
- `src/pages/public/PublicCompetitionPayment.tsx`
- `src/integrations/supabase/types.ts` (regenerated automatically after migration)
