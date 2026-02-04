
# Plan: Display Payment Information in All Payment Components

## Overview
Enhance all payment dialogs and sections to display dynamic payment instructions (Bank Transfer info or PayNow QR code) based on the selected payment method and branch template. Additionally, hide the "Cash" payment option when accessed from the Student Portal.

## Components to Update

| Component | Purpose | Changes Required |
|-----------|---------|-----------------|
| `CreatePaymentDialog.tsx` | Record payment against invoices | Add template display, hide cash for portal |
| `PayGradingDialog.tsx` | Student pays for grading registration | Add template display, hide cash for portal |
| `PaySchoolFeesDialog.tsx` | Student pays for term enrollment | Add template display, hide cash for portal |

## Detailed Changes

### 1. CreatePaymentDialog.tsx

**Add prop for Student Portal context:**
```typescript
interface CreatePaymentDialogProps {
  trigger: React.ReactNode;
  onPaymentCreated?: () => void;
  preSelectedInvoiceId?: string;
  isStudentPortal?: boolean; // NEW - to hide cash option
}
```

**Add template fetching logic:**
- Fetch invoice templates using `getInvoiceTemplates()`
- Filter to find template matching the invoice's branch country
- Map country names: `Singapore` → `SG`, `Australia` → `AU`

**Hide Cash for Student Portal:**
- When `isStudentPortal` is true, filter out the "cash" payment method from the dropdown

**Add conditional UI after Payment Method dropdown:**
- When "Bank Transfer" is selected and template has `bank_transfer_info`:
  - Display a styled card with bank transfer details
- When "PayNow" is selected and template has `paynow_qr_url`:
  - Display a styled card with the QR code image

### 2. PayGradingDialog.tsx

**Add template fetching:**
- Use React Query to fetch invoice templates
- Filter by country code based on student's branch country

**Hide Cash (currently not present, but ensure it stays hidden):**
- Current code only shows PayNow and Bank Transfer for Singapore
- Ensure "cash" is never shown in the Student Portal context

**Add conditional payment info display:**
- After the Payment Method selector, display:
  - Bank transfer info card when "bank_transfer" is selected
  - PayNow QR code card when "paynow" is selected

### 3. PaySchoolFeesDialog.tsx

**Add template fetching:**
- Fetch templates and match by branch country code

**Hide Cash (same as PayGradingDialog):**
- Remove "cash" option completely for Student Portal flows

**Add conditional payment info display:**
- Same UI pattern as other dialogs for bank info and QR codes

### 4. Update StudentDashboard.tsx

**Pass Student Portal flag:**
- When rendering `CreatePaymentDialog`, pass `isStudentPortal={true}` to hide cash option

## UI Design

**Bank Transfer Info Card:**
```text
+----------------------------------+
| 🏦 Bank Transfer Details         |
|                                  |
| [Multi-line bank transfer info   |
|  from template]                  |
+----------------------------------+
```
- Blue-tinted background (`bg-blue-50 border-blue-200`)
- Pre-formatted text preserving line breaks

**PayNow QR Code Card:**
```text
+----------------------------------+
|      Scan to Pay via PayNow      |
|                                  |
|         [ QR Code Image ]        |
|                                  |
+----------------------------------+
```
- Purple-tinted background (`bg-purple-50 border-purple-200`)
- Centered QR code image (160x160px)

## Country Code Mapping

```typescript
const countryCodeMap: Record<string, string> = {
  'Singapore': 'SG',
  'Australia': 'AU'
};
```

Templates in the database use short codes (SG/AU), while branches use full names.

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/sales/CreatePaymentDialog.tsx` | Add isStudentPortal prop, fetch template, hide cash, display payment info |
| `src/components/dashboard/PayGradingDialog.tsx` | Fetch template, display payment info based on method |
| `src/components/dashboard/PaySchoolFeesDialog.tsx` | Fetch template, display payment info based on method |
| `src/components/dashboard/StudentDashboard.tsx` | Pass isStudentPortal={true} to CreatePaymentDialog |

## Testing Checklist
- [ ] CreatePaymentDialog from Student Portal: Cash option hidden, bank info/QR shows correctly
- [ ] CreatePaymentDialog from Invoice Management: All options available, bank info/QR shows correctly
- [ ] PayGradingDialog: Bank info shows for bank_transfer, QR shows for paynow
- [ ] PaySchoolFeesDialog: Bank info shows for bank_transfer, QR shows for paynow
- [ ] Singapore branches: PayNow QR code displays correctly
- [ ] Australia branches: Bank transfer info displays correctly
- [ ] Template without bank_transfer_info: No card shown for bank transfer
- [ ] Template without paynow_qr_url: No card shown for PayNow
