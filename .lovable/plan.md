# /hello — Customer Chat Workflow

Replaces `/accessories` and `/accessories-list` with a single mobile-first conversational entry point that handles student identification, registration, free-trial enquiries, payments, and a callback escape hatch.

## Removals

- Routes: `/accessories`, `/accessories-list` (App.tsx).
- Files: `src/pages/public/PublicAccessoriesPayment.tsx`, `src/pages/public/PublicAccessoriesList.tsx`, `src/constants/accessoryBundles.ts`.
- Service: `src/services/accessoryPaymentSubmissionService.ts`.
- DB: drop `accessory_payment_submissions` table + `get_public_accessory_*` / `admin_*_accessory_*` RPCs.
- Any nav links pointing to the removed routes.

## New route: `/hello`

Single public page, mobile-first chat-style stepper. No auth. Each step is a chat "bubble" with the next prompt rendered as a sticky bottom input/control.

### Persistent escape hatch — "Not what I'm looking for"

Always-visible secondary button in the chat header (and as a tertiary option on every choice step) labelled **"Not what I'm looking for"**. Available from Step 1 onward, including mid-payment, mid-register, and mid-trial flows.

Tapping it switches the chat into a **Callback** mini-flow:
- Prefills name, contact (phone/email) and branch from anything already gathered in Step 1.
- Asks: **"How can we help?"** (free-text, required, max 500 chars).
- Submit →
  1. Inserts a row into `public_chat_callback_requests`.
  2. Marks the session `outcome = 'callback'`.
  3. Sends a transactional email to **hello@gaonhaetaekwondo.com** containing: name, DOB (if collected), branch, phone, email, the free-text message, and a timestamp.
- Confirmation bubble: **"Thank you for your message. We will get back to you shortly."**

### Step 1 — Identify
Stacked inputs, large touch targets:
- First name * (uppercased on blur)
- Last name * (uppercased on blur)
- Date of birth * (DD/MM/YYYY via existing date helpers)
- Branch * (dropdown from `useBranches`)
- Gender (optional)
- Email (optional)
- Contact number (optional, SG +65 default)

On Continue → RPC `match_student_by_identity(first, last, dob, branch_id)`. Match logic: case-insensitive name + DOB + branch.

### Step 2a — Existing student (match found)
Skip register/trial. Proceed to Payment flow. Persist `matched_student_id`.

### Step 2b — No match
Four action buttons:
1. **Register**
2. **Make a payment**
3. **Sign up for a free trial**
4. **Not what I'm looking for** → Callback mini-flow

### Step 3 — Payment flow (inline)
1. Category — School Fees · Uniform · Grading · Protection Guards & Accessories.
2. Product picker — active products for branch + category (with `price_rules` overrides).
3. Variant / size / color from `product_variants`; enforce size selection.
4. Cart summary with qty steppers.
5. PayNow QR / Bank Transfer — reuse `PaymentInfoDisplay`.
6. Proof upload — reuse `ProofOfPaymentUpload` (image/* only).
7. Submit → writes to `public_chat_payment_submissions`. Matched student → auto-create draft invoice on staff verification.

### Step 4a — Register (no match)
Inline chat registration (DOB, gender, email, contact prefilled; address, postal code, emergency contact, allergies, preferred class type/day, canvas signature). Submits via existing `studentRegistrationService`.

### Step 4b — Free trial (no match)
"Request a callback" only — confirm branch + preferred contact, optional note. Submit → inserts trial-lead row.

## Logging

Each step transition writes to `public_chat_events`: session_id, step, payload jsonb. Includes a `callback_opened` event whenever the escape hatch is tapped, and a `callback_email_sent` event on successful notification.

## Email notification (callback)

- Reuse Lovable transactional email infrastructure (already verified domain).
- New template: `_shared/transactional-email-templates/hello-callback-request.tsx`.
  - Subject: `New callback request from {firstName} {lastName}`.
  - Body: branded card listing name, DOB, branch, phone, email, message, submission time.
  - Recipient: hardcoded `hello@gaonhaetaekwondo.com`.
- Register in `registry.ts`.
- Invoked from `publicChatService.submitCallback()` via `supabase.functions.invoke('send-transactional-email', { body: { templateName: 'hello-callback-request', recipientEmail: 'hello@gaonhaetaekwondo.com', idempotencyKey: \`callback-${callbackId}\`, templateData: { ... } } })`.
- Email failure does NOT block the user's confirmation bubble — submission row is the source of truth; email is best-effort with retry via the queue.

## Data model (new tables)

- `public_chat_sessions` — id, first_name, last_name, date_of_birth, branch_id, gender, email, phone, matched_student_id, outcome (`existing_payment` / `register` / `payment` / `trial_lead` / `callback` / `abandoned`), created_at.
- `public_chat_events` — id, session_id, step, payload jsonb, created_at.
- `public_chat_payment_submissions` — id, session_id, reference_number, items jsonb, amount, payment_method, proof_url, status, matched_student_id, matched_invoice_id, created_at.
- `public_chat_callback_requests` — id, session_id, branch_id, name, contact_phone, contact_email, type (`trial_lead` / `general_callback`), message, preferred_time, status (`new` / `contacted` / `closed`), email_sent_at, created_at.

RLS: anon insert; authenticated select gated by branch access.

Stored RPCs:
- `match_student_by_identity(first, last, dob, branch_id)`
- `admin_verify_chat_payment(id, verified_by)`
- `admin_reject_chat_payment(id, reason, reviewed_by)`

## Admin surface

New "Chat submissions" sub-section inside the existing **Approvals** tab:
- Pending payments (verify / reject; suggest add student when unmatched)
- Trial leads
- General callback requests (mark contacted / closed)
- Registration requests continue via existing flow

## Out of scope

- Persisted/resumable chat across reloads.
- LLM responses — deterministic guided flow.
- Stock decrement, bundle discounts.
- Staff push notifications (approval-tab badges + email suffice).

## Technical notes

```text
src/
  pages/public/PublicHelloChat.tsx
  components/public/hello/
    ChatBubble.tsx
    IdentifyStep.tsx
    ChoiceStep.tsx
    PaymentCategoryStep.tsx
    PaymentProductStep.tsx
    PaymentSummaryStep.tsx
    InlineRegisterStep.tsx
    TrialLeadStep.tsx
    CallbackStep.tsx
    EscapeHatchButton.tsx
  services/publicChatService.ts
supabase/functions/_shared/transactional-email-templates/hello-callback-request.tsx
supabase/migrations/<ts>_public_chat.sql
```

Reuse: `PaymentInfoDisplay`, `ProofOfPaymentUpload`, `useBranches`, `useBranchCountry`, `formatDate`, `studentRegistrationService`, existing `send-transactional-email` Edge Function.

Prerequisite: confirm transactional email infra is set up (`email_domain--setup_email_infra` + `email_domain--scaffold_transactional_email`); run if missing before deploying the new template.
