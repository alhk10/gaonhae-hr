## Goal

Update the full-unlock admin password on the public Grading List page.

## Change

In `src/pages/public/PublicGradingList.tsx` line 49:

```ts
const ADMIN_FULL_UNLOCK_PASSWORD = '39SeagullWalk';
```

Replace with:

```ts
const ADMIN_FULL_UNLOCK_PASSWORD = 'Hp84311884';
```

No other references exist. Standard unlock password `Hp97533488` is unchanged. Plan doc (`.lovable/plan.md`) reference will also be updated for accuracy.