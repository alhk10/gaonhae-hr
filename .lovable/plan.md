Small changes to the /guards public purchase page:

1. Make gender, current belt, and phone optional fields (remove required markers and validation).
2. Add sizing reassurance text under the Gaonhae Protection Guard Set product option.

No database changes needed — guards_purchases already allows null for these columns.

Files to edit:
- src/pages/public/PublicGuardsPurchase.tsx (form labels, canSubmit logic, item description text)