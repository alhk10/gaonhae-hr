

# Invoice Management Enhancements Plan

## Overview
This plan implements several enhancements to the Invoice Management system:
1. **Templates Tab** - Restrict visibility to superadmins only
2. **Inline Payment Button** - Add payment action to invoice list
3. **View PDF Button** - Generate and download invoice PDFs
4. **Send PDF to WhatsApp Button** - Share invoice via WhatsApp
5. **Send PDF to Email Button** - Send invoice via email
6. **WhatsApp Field** - Add to student details for messaging

---

## 1. Templates Tab - Superadmin Only

### Current State
The Templates tab is visible to all users with invoice access in `InvoiceManagement.tsx`.

### Changes Required
- Import `useAuth` hook to get user role
- Conditionally render the Templates tab trigger and content only when `userrole === 'superadmin'`

### File Changes
| File | Change |
|------|--------|
| `src/pages/sales/InvoiceManagement.tsx` | Add auth check, conditionally render Templates tab |

---

## 2. Inline Payment Button

### Current State
The invoice list already has an inline payment button (DollarSign icon) for invoices that are not paid or cancelled. This appears to already be implemented in lines 405-420 of `InvoiceManagementList.tsx`.

### Verification
Based on the current code, this feature already exists. The payment dialog opens via `CreatePaymentDialog` when clicking the dollar sign icon. No changes needed.

---

## 3. View PDF Button

### Changes Required
Create a new invoice PDF generator utility and add a PDF button to the invoice actions.

### New File: `src/utils/invoicePDFGenerator.ts`
This utility will:
- Load company logo
- Generate formatted invoice with header, items table, totals, and footer
- Include invoice number, student name, dates, line items, tax, totals
- Follow the pattern established in `verificationLetterPDFGenerator.ts` and `payslipPDFGenerator.ts`

### UI Changes
- Add PDF download button (FileDown icon) to invoice row actions in `InvoiceManagementList.tsx`
- Button triggers `generateInvoicePDF(invoice)` which downloads the PDF

### File Changes
| File | Change |
|------|--------|
| `src/utils/invoicePDFGenerator.ts` | New file - PDF generation logic |
| `src/components/sales/InvoiceManagementList.tsx` | Add PDF download button |

---

## 4. Send PDF to WhatsApp Button

### Changes Required
WhatsApp Web API allows opening a chat with a prefilled message via URL. The flow will:
1. Generate the invoice PDF (same as View PDF)
2. Open WhatsApp Web with the student's WhatsApp number
3. User manually attaches the downloaded PDF

Since WhatsApp Web API does not support direct file attachments programmatically, the implementation will:
- Download the PDF first
- Open `https://wa.me/{whatsapp_number}?text={message}` in a new tab
- Toast message instructing user to attach the downloaded PDF

### Considerations
- Requires student to have a WhatsApp number stored
- Falls back to regular phone if WhatsApp field is empty

### File Changes
| File | Change |
|------|--------|
| `src/utils/invoicePDFGenerator.ts` | Add helper function `shareInvoiceViaWhatsApp` |
| `src/components/sales/InvoiceManagementList.tsx` | Add WhatsApp share button |

---

## 5. Send PDF to Email Button

### Changes Required
Create a new edge function to send invoice emails with PDF attachment.

### New Edge Function: `send-invoice-email`
- Receives invoice ID and recipient email
- Fetches invoice data from database
- Generates PDF on server side (or receives base64 PDF from client)
- Sends email via Resend with PDF attachment

### UI Changes
- Add email button (Mail icon) to invoice actions
- Opens dialog to confirm email address (pre-filled with student email)
- Calls edge function to send email

### File Changes
| File | Change |
|------|--------|
| `supabase/functions/send-invoice-email/index.ts` | New edge function for sending invoice emails |
| `src/components/sales/InvoiceManagementList.tsx` | Add email send button and confirmation dialog |

---

## 6. WhatsApp Field in Student Details

### Database Migration
Add `whatsapp` column to `students` table.

### Service Updates
- Update `Student` interface in `studentService.ts` to include `whatsapp` field
- Update `CreateStudentData` interface

### UI Updates
Add WhatsApp input field to:
- `AddStudentDialog.tsx` - in Personal Information section, next to Phone
- `EditStudentDialog.tsx` - same location
- `StudentDetails.tsx` / `StudentHeader.tsx` - display the field in contact info

### File Changes
| File | Change |
|------|--------|
| `supabase/migrations/...` | Add `whatsapp` column to students table |
| `src/services/studentService.ts` | Add whatsapp to interfaces |
| `src/components/sales/AddStudentDialog.tsx` | Add WhatsApp input field |
| `src/components/sales/EditStudentDialog.tsx` | Add WhatsApp input field |
| `src/pages/sales/StudentProfile.tsx` | Display WhatsApp in contact info |
| `src/integrations/supabase/types.ts` | Auto-updated with new column |

---

## Technical Implementation Details

### Invoice PDF Generator Structure

```text
+------------------------------------------+
|  [Logo]    GAONHAE TAEKWONDO LLP         |
|            Company Address               |
|            Phone | Email                 |
+------------------------------------------+
|  INVOICE                                 |
|  Invoice #: INV-2026-00001               |
|  Date: 30/01/2026                        |
|  Due Date: 01/03/2026                    |
+------------------------------------------+
|  Bill To:                                |
|  Student Name                            |
|  Student Address                         |
+------------------------------------------+
|  Description    Qty   Price      Total   |
|  ----------------------------------------|
|  Product 1       2    $50.00    $100.00  |
|  Product 2       1    $75.00    $75.00   |
+------------------------------------------+
|                  Subtotal:      $175.00  |
|                  Tax (9%):       $15.75  |
|                  Discount:       -$0.00  |
|                  ----------------------- |
|                  TOTAL:         $190.75  |
|                  Amount Paid:   $100.00  |
|                  Balance Due:    $90.75  |
+------------------------------------------+
|  Notes: Thank you for your business      |
+------------------------------------------+
```

### WhatsApp Integration Flow

```text
User clicks WhatsApp button
        |
        v
Generate PDF & download
        |
        v
Get student WhatsApp number
        |
        v
Open WhatsApp Web URL:
wa.me/{number}?text=Invoice%20{invoice_number}
        |
        v
Toast: "PDF downloaded. Please attach it to the chat."
```

### Email Integration Flow

```text
User clicks Email button
        |
        v
Show confirmation dialog with email address
        |
        v
User confirms
        |
        v
Call send-invoice-email edge function
        |
        v
Edge function:
  1. Fetch invoice data
  2. Generate PDF (server-side)
  3. Send via Resend with attachment
        |
        v
Toast: "Invoice sent to {email}"
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/...` | Create | Add whatsapp column to students |
| `src/utils/invoicePDFGenerator.ts` | Create | Invoice PDF generation utility |
| `supabase/functions/send-invoice-email/index.ts` | Create | Email sending edge function |
| `src/pages/sales/InvoiceManagement.tsx` | Modify | Restrict Templates tab to superadmin |
| `src/components/sales/InvoiceManagementList.tsx` | Modify | Add PDF, WhatsApp, Email buttons |
| `src/services/studentService.ts` | Modify | Add whatsapp to interfaces |
| `src/components/sales/AddStudentDialog.tsx` | Modify | Add WhatsApp input field |
| `src/components/sales/EditStudentDialog.tsx` | Modify | Add WhatsApp input field |
| `src/pages/sales/StudentProfile.tsx` | Modify | Display WhatsApp field |
| `src/integrations/supabase/types.ts` | Auto-update | New column types |

---

## Security Considerations

- **Templates Tab**: Role check happens client-side; server RLS already restricts template operations
- **Email Sending**: Edge function validates user authentication before sending
- **WhatsApp**: Opens external link; no sensitive data transmitted beyond phone number in URL
- **PDF Generation**: Client-side generation uses already-fetched invoice data; no additional data exposure

