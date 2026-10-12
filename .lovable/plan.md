# Refund as Credit — add quantity support

## Current behaviour
The Refund as Credit dialog (`src/components/sales/RefundAsCreditDialog.tsx`) refunds whole line items only. A line like "Black Tip & Above 1x Weekday — Term 4 2026 ×12" can only be refunded in full ($572.25); there is no way to refund part of a quantity (e.g. 4 of 12 lessons).

## Change

### Dialog (RefundAsCreditDialog.tsx)
- When a selected line has quantity > 1, show a quantity stepper/input (1 … remaining refundable quantity) next to the line.
- "Credit to issue" computes the prorated amount: (unit price + unit tax) × chosen quantity.
- Lines already partially refunded show "x of y refunded" and allow refunding the remaining quantity.
- Fully refunded lines stay disabled with the Refunded badge.

### Refund logic (invoiceRefundService.ts)
- `refundLineItem` gains an optional `quantity` parameter (default = full remaining quantity).
- Credit issued is the prorated amount for the refunded quantity.
- Item metadata tracks `refunded_quantity`; the line is only marked `refunded: true` once the full quantity is refunded, so the same line can be refunded again for the remainder.
- Entitlement/enrolment/grading cleanup only runs on full-quantity refund (a partial refund keeps the enrolment active); invoice totals are reduced by the prorated amount either way.
- Change log records the refunded quantity.

### Approval path
- `submitRefundRequest` / `submitActionRequest` payload includes per-item quantities so the superadmin approval applies the same partial amounts.
- Public `/access` path: extend the `submit_public_refund_request` RPC (migration) to accept quantities, and `get_public_invoice_detail` to return item quantity and already-refunded quantity.

### Database (one migration)
- Update `submit_public_refund_request` to accept a quantities map and store it in the action request payload.
- Ensure the approval-execution path (wherever `item_refund` requests are applied) honours the stored quantities.

## Verification
- Typecheck/build passes.
- Partial refund of a ×12 lesson line issues the correct prorated credit, keeps enrolment active, and the line remains refundable for the remainder; full refund behaves as today.
