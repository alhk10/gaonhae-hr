# Fix: available credit not showing in /hello (e.g. Darren Seow)

## What's wrong
Darren Seow (STU260303) has $457.80 credit (from a line refund today). The credit lookup for his chat session returns $457.80 when run now, but the chat asked for it a split second too early — before his session was linked to his record — so the check was rejected, treated as $0, and never asked again.

## Fix
- In the /hello chat, only look up credit once the session has been linked to the recognised student (set the match on the session first, then enable the credit lookup).
- If the lookup fails, retry a couple of times instead of silently showing nothing.
- Re-check credit when the student reaches the payment step, so the "credit used" amount is always current.

No database changes. Singapore/Australia GST handling and credit holds unchanged.

## Technical details
- `PublicHelloChat.tsx`: add `sessionLinked` state set true after `updateSessionMatchAndOutcome` resolves (~line 757); credit `useQuery` enabled on `sessionId && matched?.id && sessionLinked`; `retry: 2`; refetch on entering `payment_pay`.
- `getChatStudentCredit` in `publicChatService.ts`: throw on error (instead of returning 0) so React Query retries.
- Verify by recognising Darren Seow · 04/11/2016 · Jurong West and confirming "You have $457.80 in credit available" appears.
