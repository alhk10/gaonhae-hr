## Change

In `src/pages/public/PublicGradingPayment.tsx` (line 575), the grading slot dropdown renders each option as:

```
{label} — {where}
```

where `where` is the slot's location or branch name (e.g. "— Balmoral").

Remove the `— {where}` suffix so each item shows only the slot label (title, or date + time fallback):

```tsx
<SelectItem key={s.id} value={s.id}>
  {label}
</SelectItem>
```

No other changes. The `where` variable becomes unused and is removed.

## Out of scope

- No data/migration changes.
- No changes to other pages or PDF generation.
