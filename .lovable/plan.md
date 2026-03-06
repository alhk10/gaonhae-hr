

## Plan: Compact Mobile Invoice Tab with 6-Month Filter, Date & Name Search

### Changes to `src/components/dashboard/BranchDashboard.tsx`

**1. Remove "Last 20 invoices" description**

**2. Filter invoices by last 6 months instead of current year**
- Compute `sixMonthsAgo` using `subMonths(new Date(), 6)` from date-fns
- Update Supabase query: `.gte('created_at', sixMonthsAgo.toISOString())` and remove `.limit(20)`
- Update query key to include the 6-month marker

**3. Add date and name filtering**
- New state: `invoiceDateFilter` (Date | null), `invoiceNameFilter` (string)
- Compact filter row: small text input for name search + date picker
- Client-side filtering on fetched results

**4. Compact 2-line mobile invoice rows**
- **Line 1**: Student name (bold, truncated) + amount + status badge + action buttons (h-6 w-6)
- **Line 2**: Invoice number + date (muted, `text-[11px]`)
- Row padding: `px-2 py-1.5`
- Header buttons: `h-7 text-xs`, "Create" shortened on mobile

**5. Payment verification section — compact on mobile**
- Proof image: `w-[100px] sm:w-[252px]`
- Verify button: `text-xs h-7`

### Scope
Single file: `src/components/dashboard/BranchDashboard.tsx`. Layout + minor query/filter logic changes.

