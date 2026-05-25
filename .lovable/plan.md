## Standardise Grading List header

**`src/pages/public/PublicGradingList.tsx`**
- Replace the centered "Grading List" heading inside the Grading tab with a flex row matching Guards layout: left-aligned `<h1 className="text-lg font-semibold">Grading List</h1>` and a right-aligned outline "Lock" button that toggles unlock state (`setUnlockLevel('none')`).
- Remove the existing absolute-positioned lock icon (top-right of the page wrapper) since the Lock button now lives in the header.
- Guards tab unchanged (its embedded `PublicGuardsPurchaseList` already has the standard header).