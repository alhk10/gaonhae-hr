
## Plan: Make WhatsApp sharing resilient to hidden characters and add `whatsapp://` fallback

### Problem to address

`wa.me` currently depends on a clean phone target and a browser opening a web URL successfully. Even though the existing helper strips non-digits, there are still two weak points:

1. Phone fields may contain whitespace-only values or invisible Unicode characters that pass the current “has value” checks.
2. Some devices/browsers handle `whatsapp://send` more reliably than `wa.me`, especially when the app is installed.

### Changes

#### 1. Harden WhatsApp target sanitizing
Update `src/utils/invoicePDFGenerator.ts`:

- Replace the current simple `normalizeWhatsAppTarget` with a stricter sanitizer that:
  - runs Unicode normalization (`NFKC`)
  - removes zero-width / hidden characters such as:
    - zero-width space
    - zero-width joiner / non-joiner
    - BOM / word joiner
    - non-breaking spaces
  - trims leading/trailing whitespace
  - strips all remaining non-digits
- Add a guard so if the final digit string is empty, WhatsApp sharing aborts cleanly instead of trying to open a broken URL.

This covers the user concern about trailing spaces and hidden characters.

#### 2. Add `whatsapp://` first, with `wa.me` fallback
Update `src/utils/invoicePDFGenerator.ts` `shareInvoiceViaWhatsApp`:

- Keep building the same rich message body as today.
- Build both URLs from the same sanitized number + encoded message:
  - `whatsapp://send?phone=${digits}&text=${encodedMessage}`
  - `https://wa.me/${digits}?text=${encodedMessage}`
- Try the app scheme first:
  - open/navigate to `whatsapp://send...`
  - if the app does not take over, fall back to `wa.me` after a short timeout
- Preserve current browser-safe behavior for desktop by falling back to `wa.me` automatically.

This gives the best chance of opening WhatsApp on both mobile app and web/desktop.

#### 3. Tighten caller-side phone checks
Update both callers so whitespace-only / hidden-character-only numbers are rejected earlier:

- `src/components/dashboard/BranchDashboard.tsx`
- `src/components/sales/InvoiceManagementList.tsx`

Use a shared “candidate number” cleanup before the “No mobile number” toast so values like `"   "` or strings containing only invisible characters do not pass validation.

### Files affected

- `src/utils/invoicePDFGenerator.ts`
  - stronger WhatsApp number sanitizer
  - `whatsapp://` + `wa.me` fallback logic
  - invalid-number guard
- `src/components/dashboard/BranchDashboard.tsx`
  - stricter pre-check before calling WhatsApp share
- `src/components/sales/InvoiceManagementList.tsx`
  - same stricter pre-check

### Behavior after change

When the green WhatsApp button is clicked:

1. The stored WhatsApp/phone value is cleaned of trailing spaces and hidden characters.
2. If no usable digits remain, show the existing error toast and do nothing.
3. If digits remain:
   - try `whatsapp://send?...`
   - if that does not open the app, fall back to `https://wa.me/...`
4. The prefilled message remains the current rich template with salutation, term text, items, total, bank details, and branch signature.

### Verification

1. Number stored as `"+61 431 234 567 "` → WhatsApp opens correctly.
2. Number containing zero-width spaces or NBSPs → still opens correctly.
3. Number field containing only spaces / hidden characters → error toast, no broken link.
4. Mobile device with WhatsApp installed → `whatsapp://` opens app directly.
5. Desktop browser or device without app handling → automatically falls back to `wa.me`.
6. Branch Dashboard and Invoice Management list both behave the same.
7. SMS sharing remains unchanged.

### Out of scope

- Changing the SMS flow
- Changing the WhatsApp message content
- Country-specific number validation beyond producing a clean digits-only target
