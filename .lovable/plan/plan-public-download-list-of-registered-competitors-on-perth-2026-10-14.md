# Plan: Public "Download List of Registered Competitors" on /perthcomp

## What you'll get
A new **"Download List of Registered Competitors (PDF)"** link on /perthcomp, placed directly after the existing "Download Complete Competition Outline (PDF)" link. Anyone can click it — no password — and get a branded, up-to-date PDF of competition entries.

## What the PDF contains (entry details only)
- Competitor name, club, age category (5–6, 7–8, …), grade/belt, and entered events
- Sorted by age category, then grade, then name
- Header with event title/date/venue and a "generated on" timestamp
- Excludes cancelled/refunded entries
- **No** email, mobile, payment amounts, or proof status — those stay in the password-protected staff log

## How it works
1. **New database function** `get_perth_competition_entries()` (SECURITY DEFINER, anonymous-callable) that returns only the safe columns above from `perth_event_registrations` where the entry includes competition events and is not cancelled/refunded. This mirrors the existing `get_perth_event_availability` pattern, so no table-level public access is granted.
2. **Page update** in `src/pages/public/PublicPerthComp.tsx`: a second download link under the outline link. On click it fetches the entries via the new RPC and builds the PDF in the browser with jsPDF + autotable (the same libraries already used for the staff log exports), saving as `perth-2026-registered-competitors.pdf`.
3. Regenerate Supabase types after the migration.

## Verification
- Call the RPC directly and confirm it returns only the safe columns and excludes cancelled/refunded entries.
- Playwright: click the link on /perthcomp, capture the download, render the PDF to an image and visually check layout, columns, and that no contact/payment data appears.
- Check build log is clean.
