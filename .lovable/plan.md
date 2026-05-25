Three small tweaks to `src/pages/public/PublicGuardsPurchaseList.tsx`:

1. Hide DOB under Student column (keep name only).
2. Reorder columns so Collected appears right after Status (new order: Branch, Student, Items, Amount, Proof, Status, Collected, Details).
3. Disable the Collected checkbox until `sale_status === 'verified'` (greyed out otherwise).
