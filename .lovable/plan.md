## Add helper text to PublicGradingPayment form

File: `src/pages/public/PublicGradingPayment.tsx`

1. Under the First Name / Last Name row (col-span-2), add a small muted helper:
   `Please use your full name.` (`text-xs text-muted-foreground`)
2. Under the Email input, add helper:
   `Please ensure email is correct, confirmation will be sent to this email.` (`text-xs text-muted-foreground`)

No logic, validation, or backend changes.