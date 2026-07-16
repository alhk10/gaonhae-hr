## Scope
On `/grading-list` → Competitions tab, add an admin-only "Registered" tracking column plus a Print Report that summarises paid amounts by branch. Everything new is gated by the existing full-unlock password (`Hp84311884`) that already toggles `unlockLevel === 'full'` / `canDelete`.

## 1. Database
New migration adds a `registered` flag to competition submissions and exposes it in the list RPC.

- `ALTER TABLE public.competition_payment_submissions ADD COLUMN registered boolean NOT NULL DEFAULT false;`
- Recreate `public.get_public_competition_list(p_branch_id uuid)` (drop + create) so the returned row set adds `registered boolean` (last column, keeping every existing column/order). Body copied from current definition, adding `s.registered` to the SELECT.
- No new RLS/GRANT — inherits from the existing table/function.

Update `PublicCompetitionListRow` in `src/services/competitionPaymentSubmissionService.ts` to include `registered: boolean`, and add a small helper:

```ts
export const setCompetitionRegistered = (id: string, registered: boolean) =>
  supabase.from('competition_payment_submissions').update({ registered }).eq('id', id);
```

## 2. Competitions tab UI (`src/pages/public/PublicGradingList.tsx`)

Pass the existing `canDelete` (already true only for full unlock) down as a new prop `canManageRegistered` on `CompetitionsTab` (reuse `canDelete` to avoid a new prop if simpler).

Inside `CompetitionsTab`:

- **New column "Registered"** inserted immediately before the existing "Actions" header/cell. Rendered only when `canManageRegistered`.
  - Header: `<TableHead>Registered</TableHead>`.
  - Cell: `<Checkbox checked={r.registered} onCheckedChange={(v) => registeredMutation.mutate({ id: r.submission_id, registered: !!v })} />`.
  - `registeredMutation` uses `setCompetitionRegistered`, invalidates `['public-competition-list']`, and shows a toast.
  - Because rows are `flatMap`-ped into one row per category, only render the checkbox on the first category row for a submission (track a `Set<string>` of seen `submission_id`s while iterating) so a submission with 2 categories still shows one checkbox. Other category rows render an empty cell to keep column alignment.

- **New "Registered" filter** (only when `canManageRegistered`) placed next to the branch filter:
  - `Select` with options `All`, `Registered`, `Not registered` bound to `registeredFilter` state (`'all' | 'yes' | 'no'`, default `'all'`).
  - Applied in both the table render pipeline and `handlePrintPdf` (existing PDF).

- **New "Print Report" button** (only when `canManageRegistered`) added to the right-side button group, before "Events":
  - Uses the same event + branch + registered filters as the table.
  - Generates a new PDF via a new helper `generateCompetitionPaymentReportPDF` in `src/utils/competitionPrintPDFGenerator.ts` (same file, new export) using existing jsPDF/autoTable setup:
    - Title: `Competition Payment Report — {eventName}`.
    - Grouped by branch (alphabetical). Each group is an autoTable section:
      - Columns: `Name`, `Amount Paid`, `Total`, `GST`.
      - `Amount Paid` = `r.amount` when `paid_status === 'paid'` else 0. `Total` = same numeric as `amount`. `GST` = `Total − Total/1.09` (GST-inclusive at 9%, matching how competition invoices are priced elsewhere in the app; if a different rate is preferred, we'll adjust).
      - Branch subtotal row: totals of the three numeric columns.
    - Grand total row at the bottom summing all branches.
  - File name: `Competition_Payment_Report_{eventName}_{yyyymmdd}.pdf`.

- When `canManageRegistered` is false, none of the above (column, filter, button) render, so unauthenticated viewers see the tab unchanged.

## 3. Technical notes
- No changes to guards/seminars/grading tabs.
- No new secrets, no RLS changes; the existing `competition_payment_submissions` policies already allow admin updates.
- `registered` defaults to `false` so all existing rows appear unchecked after migration.
- GST assumption: 9% inclusive. Confirm this is right for the report; if categories are GST-exempt or use a different rate, the formula in the PDF helper is the single spot to change.

## Files touched
- `supabase/migrations/<new>.sql` — column + RPC recreate.
- `src/services/competitionPaymentSubmissionService.ts` — type + `setCompetitionRegistered`.
- `src/pages/public/PublicGradingList.tsx` — column, filter, Print Report button, mutation wiring.
- `src/utils/competitionPrintPDFGenerator.ts` — new `generateCompetitionPaymentReportPDF` export.
