

## Plan: Update SMS message to include product items and branch bank details

### Goal

Update the `shareInvoiceViaSMS` helper to format the message body with individual line items (product name + amount) and append the branch's bank transfer payment details at the end, matching the user's requested format.

### Message format

```
Hello! Your Gaonhae invoice {invoice_number} has been issued.

Items:
{product_1} - {amount_1}
{product_2} - {amount_2}

Total: {total_amount}

{branch_bank_transfer_info}

Thank you
Gaonhae Taekwondo ({branch_name})
```

### Implementation

#### 1. Update `shareInvoiceViaSMS` in `src/utils/invoicePDFGenerator.ts`

Replace the current simple message with a formatted multi-line message:

```typescript
export const shareInvoiceViaSMS = async (
  invoice: InvoiceData,
  phoneNumber: string
): Promise<void> => {
  // Clean the phone number
  const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  // Build items list
  const itemsList = invoice.items?.map(item => 
    `${item.description} - ${formatCurrency(item.total_amount)}`
  ).join('\n') || 'No items';
  
  // Build bank transfer info if available
  const bankInfo = invoice.template?.bank_transfer_info 
    ? `\n${invoice.template.bank_transfer_info}\n` 
    : '\n';
  
  // Build the message
  const message = 
    `Hello! Your Gaonhae invoice ${invoice.invoice_number} has been issued.\n\n` +
    `Items:\n${itemsList}\n\n` +
    `Total: ${formatCurrency(invoice.total_amount)}\n` +
    `${bankInfo}` +
    `Thank you\n` +
    `Gaonhae Taekwondo (${invoice.branch?.name || 'Branch'})`;
  
  // Open SMS app
  window.location.href = `sms:${cleanNumber}?&body=${encodeURIComponent(message)}`;
};
```

### Files affected

- `src/utils/invoicePDFGenerator.ts` — update `shareInvoiceViaSMS` helper with new message format including items list and bank transfer details.

### Out of scope

- No changes to the BranchDashboard UI — the button and handler remain as already implemented.
- No PDF generation or download — this is body-only SMS as requested.

