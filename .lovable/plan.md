

## Plan: Standardize all date displays to DD/MM/YYYY

### Scope
The codebase currently displays dates in many inconsistent formats:
- `format(d, 'PPP')` → "April 17th, 2026"
- `format(d, 'MMM dd, yyyy')` → "Apr 17, 2026"
- `format(d, 'MMMM dd, yyyy')` → "April 17, 2026"
- `toLocaleDateString()` (no locale) → browser-dependent (often MM/DD/YYYY in US)
- `toLocaleDateString('en-SG', {...})` → varies by options
- Native `<input type="date">` → displays in browser-locale format (the screenshot shows `12/05/2021` but on US browsers it would render `05/12/2021`)
- 3 PDF generators with their own `formatDate` helpers

Total surface: ~386 date-fns format calls in 28 files, ~432 toLocaleDateString calls in 68 files, 213 native date inputs in 27 files, plus 3 PDF utilities and 4 Supabase edge functions.

### Strategy
Centralise formatting through a single helper, then mass-migrate call-sites. Keep storage formats (ISO `yyyy-MM-dd` for DB, `Date` objects in state) untouched — only displayed/user-facing strings change.

### Step 1 — Create central date helpers
**New file: `src/utils/dateFormat.ts`**
```ts
import { format, parseISO, isValid } from 'date-fns';

const DATE_FMT = 'dd/MM/yyyy';
const DATETIME_FMT = 'dd/MM/yyyy HH:mm';

export const formatDate = (input?: Date | string | null) => { /* dd/MM/yyyy, '-' if invalid */ };
export const formatDateTime = (input?: Date | string | null) => { /* dd/MM/yyyy HH:mm */ };
export const formatDateLong = (input?: Date | string | null) => { /* dd MMM yyyy e.g. 17 Apr 2026 */ };
// ISO helper for storage stays as-is (format(d, 'yyyy-MM-dd'))
export const toISODate = (d: Date) => format(d, 'yyyy-MM-dd');
```

### Step 2 — Migrate display call-sites
Replace across all 68 files (UI components, pages, dialogs):
- `format(x, 'PPP' | 'MMM dd, yyyy' | 'MMM d, yyyy' | 'MMMM dd, yyyy' | 'MMMM d, yyyy' | 'dd MMM yyyy')` → `formatDate(x)` or `formatDateLong(x)` for headers.
- `format(x, 'MMM d, yyyy HH:mm')` → `formatDateTime(x)`.
- `new Date(x).toLocaleDateString(...)` (all variants, including `'en-SG'`, `'en-GB'`, default) → `formatDate(x)` (or `formatDateTime` when time was included).
- Compact ranges like `'MMM d'` (used in week-of headers) become `formatDateLong` short range — keep these explicitly readable: `dd MMM` via `formatRangeShort()`.

Storage-only `format(d, 'yyyy-MM-dd')` calls (e.g., for Supabase keys / queries) — leave untouched.

### Step 3 — Replace native `<input type="date">`
Native HTML date inputs render in the user's browser locale, so the same record can display as `12/05/2021` for one user and `05/12/2021` for another. To guarantee DD/MM/YYYY, replace each of the 213 occurrences in 27 files with the existing `<DatePicker>` component (which uses `format(d, 'PPP')` — also updated to `dd/MM/yyyy`). Form state continues to hold ISO strings; the picker handles conversion.

Files touched include: `StudentRegistration.tsx`, `EditEmployeeForm.tsx`, `EmployeeProfileForm.tsx`, `TermCalendarManagement.tsx`, `SubmitClaim.tsx`, `AddClaimDialog.tsx`, `EditAttendanceDialog.tsx`, `PartnerBranchSharesManager.tsx`, `SalesAnalytics.tsx`, `PartyManagement.tsx`, `TrialDetails.tsx`, `CreateEditNoticeDialog.tsx`, etc.

### Step 4 — Update DatePicker default
`src/components/ui/date-picker.tsx` — change line 46 from `format(selected, "PPP")` to `formatDate(selected)`.

### Step 5 — PDF generators & edge functions
Update the inline `formatDate` helpers in:
- `src/utils/invoicePDFGenerator.ts`
- `src/utils/casualPayslipPDFGenerator.ts`
- `src/utils/payslipPDFGenerator.ts`
- `src/utils/verificationLetterPDFGenerator.ts`

…to output `dd/MM/yyyy`.

For edge functions (`check-slot-reminders`, `check-grading-reminders`, etc.) used in notification emails, change `toLocaleDateString('en-SG', {...})` to `toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })` so emails read e.g. "17 Apr 2026".

### Step 6 — Verification
Spot-check after build:
- Student registration form (DOB picker)
- Profile page (DOB, join date)
- Branch dashboard (week ranges, approval timestamps)
- Invoices / claims / payslips list & PDF outputs
- Slot booking calendar tooltips and toast messages
- Attendance & leave history tables

### Out of scope
- Database storage formats (ISO `yyyy-MM-dd` and timestamps remain)
- Internal sort/comparison logic
- The `month` text column in payroll (already handled by separate logic per memory)

### Estimated impact
~95 files modified, primarily mechanical replacements; no functional / data-flow changes.

