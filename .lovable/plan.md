## Plan

Fix two issues on the public `/pay` (Grading Payment) page.

## 1. Missing grading fees ("No grading fee configured for this belt")

**Root cause:** there are two overloads of the `get_public_grading_products` database function — a 2-argument version and a 3-argument version where the third argument has a default. When the client calls the function without an explicit target belt, PostgreSQL cannot decide which overload to use and returns an error, so the page shows no fee.

**Fix:** drop the older 2-argument overload via a migration. The 3-argument version already covers both cases (target optional via `DEFAULT NULL`).

No code changes are needed for this — the client already calls the 3-arg version when a target is provided, and after the drop the 2-arg call will resolve unambiguously to the remaining overload.

## 2. Rework Date of Birth picker

The current calendar popover with month/year dropdowns is rendering broken (overlapping controls) inside the narrow mobile-style card. For a date of birth — which can be decades in the past — a calendar is also poor UX.

**Replace** the popover/calendar with three side-by-side dropdowns: Day, Month, Year.

- Day: 1–31, dynamic to the selected month/year (no Feb 30, etc.).
- Month: January–December.
- Year: current year down to 1950, newest first.
- When all three are selected, build a `Date` and write it to the existing `dob` state — downstream age calculation and submission stay unchanged.
- Use the existing shadcn `Select` component for consistency with Branch and Current Belt.
- Field labeled "Date of Birth", marked required.

## Files

- New migration: `DROP FUNCTION public.get_public_grading_products(text, text[]);` (the 2-arg overload only).
- `src/pages/public/PublicGradingPayment.tsx`: replace the DOB Popover/Calendar block with a 3-select picker. Remove now-unused `Popover`, `Calendar`, `CalendarIcon` imports if no longer used.

## Out of scope

- Adding/editing grading products or branch price rules (data is already correct).
- Any other field on the page.