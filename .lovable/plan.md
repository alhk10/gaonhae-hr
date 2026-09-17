# Invoices card: add invoice date + number, click row to open invoice

The Invoices card on the dashboard (`src/components/dashboard/InvoicesCreatedSection.tsx`, the table in the screenshot) gains:

1. **Two new columns on the desktop table**: `Invoice #` (the invoice number) and `Date` (the invoice date, shown as DD/MM/YYYY using the shared `formatDate` helper). Both values are already fetched by the component's query (`invoice_number`, `created_at`) — no query change needed.
2. **Click a row to open the invoice**: clicking anywhere on a row (desktop table or the mobile card) opens the existing full invoice dialog in view mode (`InvoiceDialog` with `mode="view"`, the same dialog the branch dashboard already uses). Rows get a pointer cursor and hover highlight.
3. **Refund button unaffected**: the Refund button stops the click from bubbling, so it still opens only the refund dialog.
4. **Mobile cards**: show the invoice number and date on the amount line, and tapping the card opens the same invoice view.

Editing the invoice inside that dialog refreshes the list via the existing `refetch`.

No database changes.

## Technical details

- New state: `viewInvoiceId` / dialog open flag in `InvoicesCreatedSection`.
- Render `<InvoiceDialog mode="view" invoiceId={viewInvoiceId} …>` only when an invoice is selected; `onInvoiceUpdated={() => refetch()}`.
- `onClick={(e) => { e.stopPropagation(); setRefundInvoiceId(inv.id); }}` on the Refund buttons.
- Dates via `formatDate` from `@/utils/dateFormat` (project-wide DD/MM/YYYY rule).
- Verify with typecheck and the build log after the edit.
