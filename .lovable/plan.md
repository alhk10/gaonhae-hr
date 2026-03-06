

## Plan: Conditional Default Tab on Branch Dashboard

### Goal
Default to "Approvals" tab when there are pending items, otherwise default to "Weekly Timetable".

### Change: `src/components/dashboard/BranchDashboard.tsx`

1. **Change initial state** (line 82): Set `activeTab` initial value to `'timetable'` (instead of `'students'`).

2. **Add a `useEffect`** after the `unverifiedPayments` computation (~line 353): Track whether the initial tab has been set. On first load, once `pendingRequests` and `unverifiedPayments` data is available, if either has items, switch `activeTab` to `'approvals'`. Use a ref (`hasSetInitialTab`) to ensure this only fires once per mount.

```typescript
const hasSetInitialTab = useRef(false);

useEffect(() => {
  if (!hasSetInitialTab.current && (pendingRequests.length > 0 || unverifiedPayments.length > 0)) {
    setActiveTab('approvals');
    hasSetInitialTab.current = true;
  } else if (!hasSetInitialTab.current && pendingRequests !== undefined) {
    hasSetInitialTab.current = true; // data loaded, no approvals — keep timetable
  }
}, [pendingRequests, unverifiedPayments]);
```

### Scope
- One file: `src/components/dashboard/BranchDashboard.tsx`
- No database changes

