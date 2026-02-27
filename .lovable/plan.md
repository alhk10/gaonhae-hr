

## Plan: Add Notice Popup to Student Dashboard Login Sequence

The student dashboard has a sequential popup chain: Unpaid Invoices → School Fees → Grading Congrats → Profile Completion. Active notices are missing from this chain.

### Approach

Insert a notice popup as the **first** item in the chain (before unpaid invoices). On dismissal, it chains to the next notice or to the existing unpaid invoice flow.

### Changes to `src/components/dashboard/StudentDashboard.tsx`

1. **Import** `NoticePopupDialog` and `getNotices` / `Notice` type
2. **Add state**: `activeNotices` (Notice[]), `currentNoticeIndex` (number), `showNoticePopup` (boolean)
3. **Add useQuery** to fetch active notices filtered by student's `branch_id` (where `target_branches` is null or contains the branch)
4. **Track dismissed notices** in localStorage key `dismissed_notices_{studentId}` to avoid re-showing
5. **Update the popup chain useEffect**: Start with undismissed notices first, then fall through to existing unpaid invoice → school fees → grading → profile completion chain
6. **On notice dismiss**: Mark notice as dismissed in localStorage, advance to next undismissed notice or chain to unpaid invoices
7. **Render** `NoticePopupDialog` with the current notice from the list

### Files to Modify

| File | Action |
|---|---|
| `src/components/dashboard/StudentDashboard.tsx` | Add notice popup to login sequence |

