## /pay form changes

### 1. Insert Email field after Student Name
- Add a required `email` input (type=email) on `PublicGradingPayment.tsx`, positioned directly after the Student Name field.
- Validate with a simple regex before allowing submit.
- Persist `email` on `grading_payment_submissions` (new nullable column added via migration; required at the API call site).

### 2. Add Grading Slot dropdown after Current Belt
- Add a new `Grading Slot` `Select` shown once Branch + Current Belt + (for non-foundation) product are resolved, and gating is not blocked.
- Source: a new RPC `get_public_grading_slots(p_branch_id, p_product_ids[])` returning upcoming slots where:
  - `grading_date >= today`
  - `status` is active (not cancelled)
  - `(branch_id = p_branch_id OR p_branch_id = ANY(available_branch_ids))`
  - `grading_product_ids && p_product_ids` (any selected product matches)
- Display each option as `DD/MM/YYYY HH:mm — <location or branch>`.
- Replace the current implicit `options.slot_id` with the user-chosen `selected_slot_id` for `resolved_grading_slot_id`.
- Required for submit. The existing "Next slot:" hint stays for reference.

### 3. Confirmation email on submit
- Send a transactional email to the entered address after a successful submission. One email per submission (covers multi-product foundation case by listing all selected products).
- Template name: `grading-confirmation`.
- Subject: `<StudentName> Grading Test`
- Body (plain content, brand-styled in React Email):

  > Thank you for registering for the upcoming grading test. Your grading details are as follow
  >
  > **Grading(s):** <list of product names>
  > **Date/Time:** <slot date DD/MM/YYYY at HH:mm>
  > **Branch:** <branch name>
  > **Address:** <branch address>
  >
  > Please be at the grading venue punctually. You may be refused grading if you are late.
  >
  > **Grading Attire** — White Uniform with White, Poom or Dan Collar
  > - No under shirt or t-shirt under uniform for Male.
  > - Plain white t-shirt under the uniform for Female.
  > - Ensure Uniform is clean and pressed.
  > - Ensure nails are trimmed.
  > - No accessories e.g. Watch, bracelets, necklace, earrings. Only ear studs are allowed.
  > - Green belt and above please wear your Arm, Shin and Groin Guards before arriving.
  > - Blue belt and above please wear your Arm, Shin, Groin, Headgear and Chest guards before arriving.
  >
  > Should you have any further questions, please check with your masters.
  >
  > Please do not reply to this email.
  >
  > Thank you
  > Gaonhae Taekwondo

- Invoked from the client right after `submitGradingPayment` succeeds, via `supabase.functions.invoke('send-transactional-email', { body: { templateName: 'grading-confirmation', recipientEmail, idempotencyKey: `grading-${submissionId}`, templateData: {...} } })`.

### 4. Email infrastructure prerequisite
No email sender domain is configured for the project yet, so emails cannot be sent until that's done. Setup is a one-time step — after it, the agent will scaffold the transactional email function and the new template automatically.

## Files

- Migration:
  - `alter table grading_payment_submissions add column email text;`
  - New RPC `get_public_grading_slots(uuid, uuid[])`.
- `src/services/gradingPaymentSubmissionService.ts`: add `email` to input, add `getPublicGradingSlots`, return inserted id for idempotency key.
- `src/pages/public/PublicGradingPayment.tsx`: email input, slot Select, wire `selected_slot_id`, call `send-transactional-email` after submit.
- `supabase/functions/_shared/transactional-email-templates/grading-confirmation.tsx` + `registry.ts` update.
- `email_domain--setup_email_infra` + `email_domain--scaffold_transactional_email` after domain is configured.

## Out of scope

- Editing existing slot/product/branch data.
- Changing auth email templates.
