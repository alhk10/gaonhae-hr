Add two new options to the Remark dropdown in the grading list.

**File:** `src/pages/public/PublicGradingList.tsx` (line 81)

Update `REMARK_OPTIONS` from:
```ts
['AWOL', 'Medical Certificate', 'Double Testing', 'Video Testing']
```
to:
```ts
['AWOL', 'Medical Certificate', 'Double Testing', 'Video Testing', 'To delete. Duplicate', 'For refund as credits']
```

These new options will automatically appear in all three Remark dropdowns (lines 1428, 1713, 1830) since they all map over `REMARK_OPTIONS`. No DB or schema changes — the `remark` column already stores free-form text.