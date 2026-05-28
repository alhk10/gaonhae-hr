## Update `/guards` order confirmation email

### Template changes — `supabase/functions/_shared/transactional-email-templates/guards-order-received.tsx`

- Extend props to accept `fullName`, `items` (array of `{ label, qty, unit_price_inc }`), `subtotal`, `gst_amount`, `total`, `referenceNumber`.
- Change subject to a function: `` `${fullName} Protection Guard Order` `` (fallback to "Your" if name missing).
- Replace body with the requested copy:
  - Greeting: `Hi <FirstName>,` (fallback `Hi,`)
  - `Thank you for your protection guard order. Your order are as follows:`
  - Order details block — a small table listing each item (label × qty @ $unit = line total), followed by Subtotal, GST (if > 0), and Total. Include reference number row.
  - `We will update you when your guards are ready for collection.`
  - `Should you have any further questions, please check with your masters.`
  - `Please do not reply to this email.`
  - Sign-off: `Thank you` / `Gaonhae Taekwondo`

### Caller change — `src/services/guardsPurchaseService.ts`

In the `submitGuardsPurchase` invoke of `send-transactional-email`, expand `templateData` to pass: `firstName`, `fullName` (`${fn} ${ln}`), `referenceNumber`, `items` (mapped from `input.items`), `subtotal`, `gst_amount`, `total`.

### Deploy

Redeploy `send-transactional-email` so the updated template registry takes effect.

### Out of scope

- `guards-collected.tsx` (not requested).
- Sender / FROM address, infra, queue config.