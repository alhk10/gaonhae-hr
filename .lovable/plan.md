# Automatic check of payment screenshots

## What it does

When a parent uploads their payment screenshot on any public payment page, the image is read automatically and the amount on it is compared with the amount due.

- **At upload:** within a few seconds the page shows one of three results under the upload box:
  - Amount matches — green tick, "Screenshot shows $190.75 — matches"
  - Amount differs — amber warning, "Screenshot shows $175.00 but $190.75 is due. Please check before submitting." The parent can still submit.
  - Couldn't be read — grey note, "We couldn't read the amount; staff will check it." Submitting is never blocked.
- **After submission:** the result is saved with the payment, so staff see a green "Amount verified $190.75", amber "Amount mismatch — screenshot $175.00", or grey "Not readable" badge on the submission in the approvals list, and in the review dialog alongside the proof image.
- Staff still verify every payment manually. Nothing is auto-approved.

Besides the amount, the reading also captures the transfer date, reference number and recipient name when visible, shown to staff as extra detail to help spot reused or unrelated screenshots.

Applies to all public payment routes: school fees (including /hello), grading, competition, seminar, and uniforms/guards.

## Technical notes

**New edge function `scan-payment-proof`**
- Input: the uploaded image as a base64 data URL (or an existing proof storage path), the expected amount and currency.
- Calls Lovable AI (`openai/gpt-6-astra` on `/v1/responses`, streaming, low reasoning effort) with the image plus a strict JSON schema returning `amount`, `currency`, `paid_at`, `reference`, `recipient`, `confidence`, `readable`.
- Compares to the expected amount server-side and returns `status: 'match' | 'mismatch' | 'unreadable'` plus the parsed fields. `LOVABLE_API_KEY` stays server-side; no timeouts wrapped around the call; 402/429 and other gateway failures return `unreadable` so a parent is never blocked.
- Anonymous invocation allowed (public forms), with a size cap on the image and no database writes from the scan itself.

**Database**
- Add to `grading_payment_submissions`, `competition_payment_submissions`, `seminar_payment_submissions`, `public_chat_payment_submissions` and `guards_purchases`: `proof_scan_status text`, `proof_scan_amount numeric`, `proof_scan_details jsonb`, all nullable with no default.
- The public submit RPCs/services accept and store these values; they are advisory only and never influence status or invoicing.

**Front end**
- One shared hook `usePaymentProofScan` used by `PublicSchoolFeesPayment`, `PublicGradingPayment`, `PublicCompetitionPayment`, `PublicSeminarPayment`, `PublicGuardsPurchase` and `PublicHelloChat`: fires on file selection, shows a small inline scanning/result state, and passes the result into the existing submit call.
- `UnifiedSubmissionApprovals` gains the scan badge in the list and the parsed detail (amount, date, reference) in the review/proof dialog.

## Verification

- Submit a test payment with a matching screenshot, a wrong-amount screenshot and an unreadable image; confirm the three states appear at upload and are saved against the submission.
- Confirm submission is never blocked and existing verification/matching behaviour is unchanged.
