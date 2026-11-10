# Hide Grading Summary button

- In `/access` Grading, the **Grading Summary** download button shows only when unlocked with the all-branch password (Hp97533488) or when signed in as a superadmin. Everyone else, including branch passwords, won't see it.

## Technical details
- `PublicGradingList.tsx`: change the button condition to `(editMode && isAllBranch) || isSuperadminUser` (superadmin comes from the existing server-checked `useIsSuperadminUser` hook).
