## Goal
Add an **Export CPF ezpay (CSV)** button on the CPF Contribution Submission step of Payroll Processing that produces a CSV matching the provided ESS Employee Template, pre-filled from each employee's profile and the current payroll period. Also extend the **Employee profile** to capture the fields currently missing for ezpay.

## Part A — New employee profile fields

Add these columns to `public.employees` (nullable, no defaults that distort existing rows):

| Field | DB column | Type | UI input |
|---|---|---|---|
| PR Start Date | `pr_start_date` | `date` | Date picker, only enabled when residency is PR Yr 1/2 |
| CPF Contribution Type | `cpf_contribution_type` | `text` (`F/G` or `G/G`) | Select, only for PR Yr 1/2 |
| Additional Wages (monthly default) | `additional_wages_default` | `numeric(10,2)` default `0` | Number input (used as fallback when no per-month AW recorded) |
| Self-Help Group (Agency) | `self_help_group` | `text` (`CDAC` / `MBMF` / `SINDA` / `ECF` / null) | Select; auto-suggested from race but editable |
| Agency Fund Amount override | `agency_fund_amount` | `numeric(10,2)` nullable | Optional override; if blank, ezpay export leaves it blank and CPF Board auto-computes |
| SDL Payable | `sdl_payable` | `boolean` default `true` | Checkbox |

Surface all new fields in:
- `src/components/employee/EditEmployeeForm.tsx` — add a **CPF / ezpay Details** section grouping NRIC, DOB, residency status, the new fields, join date, resign date.
- `src/components/employee/EmployeeProfileForm.tsx` — show the same fields read-only for self-service profile view.
- `src/services/employeeService.ts` — extend the select lists, mappers, create/update payloads, and the `EmployeeProfile` type in `src/types/employee.ts` with the new keys (camelCase).

No data backfill required — null/false values mean the export simply omits that column for the row.

## Part B — Export CPF ezpay CSV button

Location: `src/pages/PayrollProcessing.tsx`, CPF step card (around line 1924), new outline button between **Back** and **Submit CPF Contributions**, labelled **Export CPF ezpay** with a `Download` icon.

### Column mapping (template → source)

| Template column | Source |
|---|---|
| CPF Account No | `employee.nric` |
| Name of Employee (as per NRIC) | `employee.name` (uppercase) |
| Ordinary Wages ($) | CPF row `grossPay` (basic/rate, 2dp) |
| Additional Wages ($) | `employee.additional_wages_default` (or 0 if null) |
| Agency Fund ($) | `employee.agency_fund_amount` (blank if null) |
| Agency (CDAC/MBMF/SINDA/ECF) | `employee.self_help_group` (blank if null) |
| Citizenship | mapped from `residency_status`: Singaporean / PR Yr 3+ → `3`, PR Yr 1 → `1`, PR Yr 2 → `2` |
| PR Start Date | `employee.pr_start_date` formatted `DD.MMM.YYYY` |
| Type (F/G or G/G) | `employee.cpf_contribution_type` (blank for citizens / PR Yr 3+) |
| Employment Status | derived from selected period vs `join_date` / `resign_date`: both in-period → `New & Leaving`; join in-period → `New`; resign in-period → `Left`; else → `Existing` |
| Date Left Employment | `resign_date` formatted `DD.MMM.YYYY` if within period, else blank |
| Date of Birth | `employee.date_of_birth` formatted `DD.MMM.YYYY` |
| SDL Payable | `Yes` if `sdl_payable` true, else `No` |

CSV rules: header line copied verbatim from the template; each field CSV-escaped (quote + double quotes if containing comma/quote); month abbreviation uppercase (`JAN`, `FEB`, …). Filename `CPF_ezpay_{YYYY-MM}.csv` from `selectedPeriod`. Download via Blob + temporary `<a download>`.

## Implementation order
1. **Migration** (Part A schema) — single migration adding the six columns. RLS already covers `employees`; no new policies needed.
2. **Types & service** — extend `EmployeeProfile` and `employeeService.ts` mappers and create/update payloads.
3. **Forms** — add the new fields to `EditEmployeeForm.tsx` and surface read-only on `EmployeeProfileForm.tsx`.
4. **Export button & helper** — add `handleExportCpfEzpay()` in `PayrollProcessing.tsx`, plus the new `Button` in the CPF step.

## Out of scope
- No RLS changes; no edge function; no per-month AW table (uses the single default field — can be expanded later if you need different bonus amounts per month).
- No automatic backfill of new fields — admins fill them in via the employee profile screen.
