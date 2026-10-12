# Pay a specific outstanding invoice from /hello

## Problem
In the outstanding-invoices popup, **Pay now** currently drops the parent into the "Pay Term Fees" product picker, which creates a *new* invoice — it never pays the actual outstanding invoice (e.g. Ellie's INV-2026-00512, $214).

## Changes

### 1. New database function (migration)
`pay_public_chat_invoice(p_session_id, p_student_id, p_invoice_id, p_payment_method, p_proof_url, p_client_ref)` — SECURITY DEFINER, same pattern as the existing chat payment function:
- Validates the chat session and that the invoice belongs to the recognized student.
- Rejects cancelled/refunded invoices or zero balance.
- Applies available student credit first (existing credit rules), then records the remaining amount as a payment with the uploaded proof, marked pending staff verification.
- Recalculates the invoice's paid/balance/status on the same invoice — never creates a new invoice.
- Idempotent via `client_ref` so double-taps/retries can't duplicate the payment.

### 2. New pay-invoice screen in `/hello` (`src/pages/public/PublicHelloChat.tsx`)
- New stage showing: invoice number, balance due, credit automatically applied (if any), amount to pay, PayNow/bank transfer details (existing PaymentInfoDisplay), proof-of-payment upload with the existing amount scan.
- If credit fully covers the balance, no proof is needed — just confirm.
- On submit: "Thank you for your payment. Your payment will be verified by our staff." then back to the menu with invoices refreshed.

### 3. Popup wiring
- Each invoice row gets its own **Pay** button (tapping the invoice number still downloads the PDF).
- The popup's main **Pay now** button and the red **Outstanding Invoice** menu button open the pay screen for the oldest outstanding invoice; after paying, if more remain, the parent can continue to the next.

## Verification
- Typecheck/build; test the RPC directly against Ellie's invoice with a test payment, then remove the test data.
