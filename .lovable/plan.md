## Goal

Change two public URLs:
- `/grading-list` (admin list page) → `/access`
- `/pay` (public grading payment form) → `/grading`

## Changes

**src/App.tsx**
- `<Route path="/pay" .../>` becomes `<Route path="/grading" element={<PublicGradingPayment />} />`
- `<Route path="/grading-list" .../>` becomes `<Route path="/access" element={<PublicGradingList />} />`
- Add backwards-compatible redirects so existing links/QR codes keep working:
  - `/pay` → redirect to `/grading`
  - `/grading-list` → redirect to `/access`
- Update the existing `/guardspurchase-list` redirect to point at `/access`.

**src/pages/public/PublicHelloChat.tsx**
- `navigate('/grading-list')` → `navigate('/access')`

**Comment/doc references** (no behaviour change): update the "Mounted at /pay" / "/grading-list" header comments in `PublicGradingPayment.tsx`, `PublicGradingList.tsx`, `PublicCompetitionPayment.tsx`, `PublicSeminarPayment.tsx`, `PublicGuardsPurchase.tsx`, and the affected service/dialog files.

## Notes

- Component file names and the `src/components/grading-list/` folder stay as-is; only URLs change.
- No database or edge function changes needed — no server-side code references these paths.
