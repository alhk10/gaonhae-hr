Add a lock icon button at the top-right of the unlocked PublicGradingList view to return to the password page.

1. Insert a `<Button variant="ghost" size="icon" onClick={handleLock}>` with a `<Lock>` icon into the header flex row of the Grading tab (next to the "Grading List" heading). The same lock button will appear in the header area shared across all tabs, positioned at the top right.

2. The `handleLock` function already exists and clears `unlockLevel` + `sessionStorage` — no logic changes needed.

Files to edit:
- src/pages/public/PublicGradingList.tsx
