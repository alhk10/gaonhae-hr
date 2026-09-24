# Plan: Outstanding features

Four approved work items, in this order.

## 1. Duplicate submission hardening (finish)

The duplicate prompt already exists for grading, competitions, seminars and uniforms & guards. Remaining:

- **Edit unverified submissions**: when a parent chooses "update existing", allow changing amount, items and contact details, and require a fresh payment proof. Applies to grading, competition, seminar and guards forms.
- **Verified submissions**: edits become staff approval requests instead of direct changes (superadmin approves, same pattern as existing deletion requests).
- **Server-side duplicate protection**: add a `client_ref` (unique per form attempt) so a double-tap or page refresh can never create two submissions or two invoices — enforced in the database for grading, guards and the /hello chat invoice function.

## 2. Remove grading entry restrictions (staff only)

- Remove belt and age restrictions when staff enter grading information or assign grading slots from the staff invoice dialog and grading tab.
- Student portal and /hello keep their current eligibility rules — unchanged.
- Improve the "no grading slots" message so it says why nothing matched (e.g. create a slot in Sales → Grading).

## 3. Invoice edit rows layout

- Rework the item rows in the edit-invoice dialog to the same layout as Create Invoice (same field order, sizing and compact styling).
- Amounts, GST and totals already match Create Invoice — this change is visual/structural only, no calculation changes.

## 4. End-to-end /hello payment test

- Walk through a live test with a real test student covering: full payment, part-credit + PayNow, and credit-only payment.
- Verify each path creates the right invoice, applies GST correctly, settles/releases credit holds, and shows the right status on the /access tabs.
- Creates real invoices on a test student; we'll use a clearly named test student and clean up afterwards.

## Technical notes

- Database changes (client_ref columns, unique constraints, edit-request handling) go through a migration; public functions stay SECURITY DEFINER as today.
- No changes to student portal or /hello eligibility logic.
- Typecheck and build verified after each item.
