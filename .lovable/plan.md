

## Plan: "Unpaid Term" filter should pick the upcoming term during the inter-term gap

### Root cause

Today is 21 Apr 2026. For Morley, Term 1 2026 ended 10 Apr and Term 2 2026 starts 28 Apr — we're in the inter-term gap. In `src/components/dashboard/BranchDashboard.tsx` (line 467), `displayTerm = currentTerm || mostRecentTerm`. Since `currentTerm` is null (no active term covers today), the filter falls back to `mostRecentTerm`, which `getMostRecentTerm` resolves to the most recent **past** term — i.e. Term 1 2026.

The "Unpaid Term" filter (line 844-848) then asks "who has no paid/verified lesson invoice for Term 1 2026?". ALEX, EARL JOHN, ELLIOT, ETHAN, HENRY have already been issued and verified Term 2 2026 invoices (confirmed in DB) but not Term 1, so they correctly fail the Term 1 check and incorrectly appear in the "Unpaid Term" list.

### Fix

Introduce an "upcoming term" lookup and prefer it over the past term whenever there's no active current term. The filter then targets the term that staff are actually trying to collect for.

#### 1. New helper in `src/services/termCalendarService.ts`

Add `getUpcomingTerm(branchId)`:
- Selects from `term_calendars` where `branch_id = branchId`, `is_active = true`, `start_date > today`, ordered by `start_date asc`, limit 1.
- Returns the same `Term` shape as `getCurrentTerm`.

#### 2. New term selection precedence in `BranchDashboard.tsx`

- Add a `useQuery` for `getUpcomingTerm(branchId)`, enabled only when there's no `currentTerm`.
- Change line 467 to:
  ```ts
  const displayTerm = currentTerm || upcomingTerm || mostRecentTerm || null;
  ```
- This makes the "fee-collection term" the active driver:
  - During a term → that term (unchanged).
  - In the inter-term gap → the **upcoming** term (new behaviour, what staff are billing for).
  - Only if no upcoming term exists at all (end of year, etc.) → fall back to most recent past term (preserves current behaviour for grading-list display).

#### 3. Scope of the change

Because `displayTerm` also drives:
- Outstanding-balance card (line 491)
- Grading metrics (line 510)
- Paid-term-student-ids (line 630)
- Grading List default term (`GradingListTab.tsx` reads `displayTerm` via prop)

…all of these will now reflect the upcoming term during the gap, which is the desired operational view (you want to see who still hasn't paid for the term that's about to start, not the one that just ended). This matches the existing memory rule: *"Display term falls back to most recent."* — extended to prefer the upcoming term first.

#### 4. No DB changes

All term records already exist; only the client-side selection precedence changes.

### Verification (Morley, today 21 Apr 2026)

1. Open Branch Dashboard → Students tab → filter **Unpaid Class Fees (Current Term)** → ALEX, EARL JOHN, ELLIOT, ETHAN, HENRY no longer appear (they have verified Term 2 2026 invoices).
2. Filter chip still labelled "Unpaid Term" — copy unchanged.
3. Students with no Term 2 2026 lesson invoice yet still appear (e.g. ARIANA, CIELLE if they haven't been invoiced yet).
4. After 28 Apr 2026 when Term 2 becomes the current term → behaviour unchanged (same term picked, just via the `currentTerm` branch instead of `upcomingTerm`).
5. Outstanding balance card and Grading metrics now reflect Term 2 2026 during the gap — the term staff are actively collecting for.
6. Branches with no upcoming active term configured → continue to fall back to the most recent past term (no regression).

### Files affected

- `src/services/termCalendarService.ts` — add `getUpcomingTerm`.
- `src/components/dashboard/BranchDashboard.tsx` — query upcoming term, update `displayTerm` precedence.

### Out of scope

- Changing the filter label or adding a manual term picker.
- Treating Term 1 invoices as still "owed" once Term 2 has begun.
- Any backend / RLS / migration work.

