# Superadmin can edit claim dates

Let superadmins change a claim's date inline in the Manage Claims tab on `/submit-claim`. Everyone else keeps the current read-only date.

## What changes

- When a superadmin puts a row into inline edit mode (pencil icon), the **Date** cell becomes an editable date field alongside Type, Amount and Description.
- The picker follows the project's DD/MM/YYYY standard (no native date input) and pre-fills with the claim's existing date.
- Saving writes the new date back to the claim; the list reloads and shows the updated date.
- Non-superadmins see the date as plain text while editing, exactly as today.

## Technical notes

- `src/components/claim/ClaimsManagementContent.tsx`
  - Read the role from `AuthContext` (`userrole === 'superadmin'`).
  - Add `date` to the `editData` state; render a calendar popover cell only for superadmins.
  - Pass the value through on save.
- `src/services/claimsService.ts`
  - Extend `updateClaim` to accept an optional `date` and map it to the `submitted_date` column (ISO timestamp).
- Note: `submitted_date` also drives the Branch P&L month bucket for approved partner claims. Changing the date of an already-approved partner claim will not retro-move an existing P&L entry — out of scope unless you want that too.
