# Inline View and Edit for Manage Claims

Add per-row **View** (receipt) and **Edit** (inline) actions to the Manage Claims tab on `/submit-claim`, mirroring how the superadmin Claims Approvals card already works.

## What changes

In the Claims List table (Manage Claims tab):

- **Actions column** gets three icon buttons on every row, not just pending ones:
  - Pencil — switch that row into inline edit mode
  - Approve / Reject — unchanged, still only for Pending rows
- **Inline edit mode** turns Type, Amount and Description into editable fields in place (Type = dropdown of claim types, Amount = number input, Description = text input), with tick (save) and cross (cancel) icons replacing the row actions.
- **Receipt column** added: a "View" link that opens the uploaded receipt in a new tab via the existing signed-URL component; shows "-" when no receipt exists.
- **Description column** added so the edited value is visible, truncated on wide text.
- Amount displays via the shared currency formatter instead of raw `S$` concatenation.

Editing is allowed for any status (an admin fixing an already-approved claim), and the list reloads after each save.

## Technical notes

- File: `src/components/claim/ClaimsManagementContent.tsx`
- Reuse existing pieces — no new services or DB changes:
  - `updateClaim(id, { type, amount, description })` from `src/services/claimsService.ts`
  - `getClaimTypes()` from `src/services/claimTypesService.ts` for the Type dropdown
  - `SignedLink` from `src/components/common/SignedMedia` for receipt links
  - `formatCurrency` from `src/utils/currencyUtils`
- Local state: `editingId: number | null` and `editData { type, amount, description }`, same pattern as `src/components/dashboard/ClaimsApprovals.tsx`.
- `ClaimWithEmployee` already carries `receipt_url` and `description`, so no data-fetch change is needed.
- Validate amount is a positive number before saving; toast on error.
