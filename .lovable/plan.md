## Move "Grading List" title under the Grading tab

**`src/pages/public/PublicGradingList.tsx`**
- Remove the page-level `<h1>Grading List</h1>` heading from above the Tabs.
- Inside `<TabsContent value="grading">`, render the "Grading List" heading at the top so it only shows when the Grading tab is active.
- Guards tab remains unchanged (its embedded `PublicGuardsPurchaseList` already has its own heading).

No other files or logic change.