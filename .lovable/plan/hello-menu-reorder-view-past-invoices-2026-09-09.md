# /hello menu: reorder + View Past Invoices

Update the action menu on `/hello` (PublicHelloChat.tsx) for returning students.

## Button order (top to bottom)
1. Pay Term Fees (primary)
2. Schedule / Reschedule a lesson — moved up from the bottom
3. Register for grading
4. Order Uniforms and Apparel
5. Order Protection Guards and Accessories
6. View Past Invoices — new button (Receipt icon), added after guards

## View Past Invoices
- New secure RPC `get_public_chat_invoices(p_session_id)`: validates the public chat session, returns the matched student's invoices — invoice number, issue date, due date, total, and status (paid / verified / unpaid / partial / overdue / cancelled).
- New chat step `past_invoices`: renders the invoices as a compact list (invoice number, date, amount, status badge, dates as DD/MM/YYYY). Tap a row to open the invoice PDF via the existing signed-URL helper.
- If no invoices: show "No invoices found" with a back button.

## Technical notes
- Files: `src/pages/public/PublicHelloChat.tsx` (menu order + new stage), `src/services/publicChatService.ts` (RPC wrapper), one migration for the new RPC (SECURITY DEFINER, session-validated, anon/authenticated/service_role grants).
- Reuses existing stage/logChatEvent patterns; logs a `past_invoices_viewed` event.
