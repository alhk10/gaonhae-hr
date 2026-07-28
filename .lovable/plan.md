## Goal

Make the public `/seminars` page look and behave exactly like `/comps`, driven by the seminar events that admins configure in the Seminars tab settings on `/grading-list`.

## Current gap

`/seminars` already reads events and packages from the database, but the layout is still the old single-seminar form: hard-coded title, event picker buried mid-form, plain file inputs, no pre-submission document checklist, no GST breakdown.

## Changes (all in `src/pages/public/PublicSeminarPayment.tsx`)

1. **Header** — replace the hard-coded "Unarmed Combat Seminar / Bukit Merah Branch · June 2026" with "Seminar Registration" plus the selected event name as the subtitle. Card title becomes "Registration Details".

2. **Event-first form** — move the Seminar (event) select to the top of the form, exactly like the Event field on `/comps`. Everything below stays hidden until an event is chosen, with the same "No active seminars. Please contact the academy." message when nothing is open. Auto-select when only one active event exists.

3. **Document checklist alert** — mirror the `/comps` "Before you submit — documents required" panel: numbered list built from the event's passport / photo / grading-card / indemnity requirements, a "Download Indemnity Form (PDF)" button when a template is attached, and the "Accepted formats: PDF, JPG, PNG (max 5 MB each)" note.

4. **Field order and components** — same sequence as `/comps`: First/Last name, Email, Branch, Date of Birth, Gender, Current Belt (age-filtered like `/comps`), then packages, then uploads. All uploads switch from raw file inputs to the shared `ProofOfPaymentUpload` component (photo, passport, grading card, signed indemnity form, payment proof) so previews, size checks, and PDF rules match.

5. **Packages block** — keep the radio list of the event's packages, styled like the competition Categories block, showing each package label, session dates, and price.

6. **Indemnity clause and signature** — same layout as `/comps`: scrollable clause box, agreement checkbox, signature pad, all required only when the event defines a clause.

7. **Totals** — add the same GST-aware summary as `/comps` (subtotal excl. GST, GST at the branch country rate, total incl. GST; single Total line for non-GST countries), and show the amount on the submit button.

8. **Success screen** — mirror the competition confirmation card and reset every field (including event, package, and all uploads) on "Submit Another Registration".

## Technical notes

- No database or service changes needed: `getPublicSeminarEvents`, `submitSeminarPayment` (event_id, passport, photo, grading card, indemnity, signature) and the Seminars tab settings dialog already support all of this.
- Age-based belt filtering and the GST rate helper are copied from `PublicCompetitionPayment.tsx`; shared helpers (`DobPicker`, `calcAge`) already exist in both files.
- Validation follows the event flags: a required document blocks submission only when the selected event asks for it.
