

## Plan: Fix WhatsApp Invoice PDF Header & WhatsApp URL Error

### Problems Identified

1. **Different PDF headers**: The "Download PDF" button fetches templates using `.eq('country', countryCode)`, while the "WhatsApp Share" button fetches templates using `.eq('branch_id', invoice.branch_id)`. This causes different (or no) templates to be found, resulting in different headers.

2. **WhatsApp URL fails**: `https://wa.me/` triggers `NET::ERR_CERT_AUTHORITY_INVALID` on some networks. The URL `https://api.whatsapp.com/send` is more widely supported.

### Changes

#### 1. Unify template fetching in `BranchDashboard.tsx` — `handleWhatsAppShare`

Replace the WhatsApp handler's template query (currently filtering by `branch_id`) with the same logic used by `handleDownloadPDF`: query by country code first, then fall back. Additionally, add `bank_transfer_info` to the template object (currently missing from the WhatsApp path).

**File**: `src/components/dashboard/BranchDashboard.tsx` (lines ~250-304)
- Change template query from `.eq('branch_id', invoice.branch_id)` to `.eq('country', countryCode).eq('is_active', true)` — matching the download handler exactly.

#### 2. Fix WhatsApp URL in `invoicePDFGenerator.ts`

**File**: `src/utils/invoicePDFGenerator.ts` (line 518)
- Change `https://wa.me/${cleanNumber}?text=${message}` to `https://api.whatsapp.com/send?phone=${cleanNumber}&text=${message}`
- This URL is more reliable across networks and firewalls.

#### 3. Add `bank_transfer_info` to WhatsApp template object

The download handler doesn't include `bank_transfer_info` either (both miss it from the select). Ensure both paths include it in the template fields selected and passed to `InvoiceData`.

### Technical Details

- Template query alignment: both handlers will use `supabase.from('invoice_templates').select('letterhead_url, paynow_qr_url, country, default_notes, footer_text, bank_transfer_info').eq('country', countryCode).eq('is_active', true).limit(1)`
- If a branch-specific template exists, try that first, then fall back to country — per user's preference of "branch first"
- WhatsApp API URL change is a drop-in replacement with identical parameter semantics

