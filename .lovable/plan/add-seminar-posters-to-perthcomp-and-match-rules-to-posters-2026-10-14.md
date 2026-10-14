# Add seminar posters to /perthcomp and match rules to posters

## What changes

1. **Two seminar posters above the Seminars section** on `/perthcomp`:
   - Upload the two provided images (Kyorugi Seminar, Poomsae Seminar) as CDN assets.
   - Show them side by side on desktop (stacked on mobile) directly above the "Saturday 28 Nov 2026 — Seminars" card. White-background posters sit cleanly on the page.

2. **Registration rules updated to match the posters** (user confirmed poster values win):
   - Poomsae Seminar 2: **2:40pm – 4:10pm** (was 12:40–2:40pm).
   - Kyorugi Seminar 2: **4:20pm – 5:50pm** (was 2:50–5:50pm), minimum age **10+** (was 9+).
   - Kyorugi Seminar 1: **Green Belt & Above** (grades Green g6 through Black Tip g1; was Green to Red).
   - Per-seminar capacities: **Poomsae 1 = 30, Kyorugi 1 = 30, Poomsae 2 = 50, Kyorugi 2 = 30** (was 60 each).
   - With the new times no two seminars overlap, so the "Kyorugi 1 overlaps Poomsae 2" restriction is removed from the form and the database.

## Files

- `src/utils/perthCompRules.ts` — update `SEMINARS` times, `who` text and per-seminar `cap`; `seminarIneligibility`: ks1 allows ranks 4–9, ks2 minimum age 10, remove the ks1/ps2 overlap rule.
- `src/pages/public/PublicPerthComp.tsx` — poster images above the Seminars card; replace the hardcoded "60 places per seminar" text and staff-log `X/60` counters with each seminar's cap.
- New Supabase migration — update `get_perth_event_availability` (per-seminar caps 30/30/50/30) and `submit_perth_event_registration` (ks1 rank 4–9, ks2 age 10+, per-seminar cap check, drop overlap check).
- `src/utils/perthCompRules.test.ts` — update tests: Kyorugi 2 needs age 10+ and Red belt or above; Kyorugi 1 allows Black Tip and rejects White/Yellow; seminar caps are 30/30/50/30; no ks1+ps2 conflict.

## Verification

- Run the rules test suite and typecheck.
- Playwright: /perthcomp shows both posters above the Seminars section, updated times/caps in the list, places-left counts using the new caps.
