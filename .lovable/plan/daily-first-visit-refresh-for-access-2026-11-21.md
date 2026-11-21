# Daily first-visit refresh for /access

## What changes
The first time /access is opened each day on a device, the page reloads once automatically so staff always start the day on the latest version with fresh data. Later visits that same day open normally (no extra reloads). The staff password session stays unlocked if it is still valid.

## How it works
- "Day" = Singapore date (UTC+8), so all branches share one cutoff at midnight SGT.
- On opening /access, the device compares today's date with the last saved refresh date.
- If different: save today's date, then reload once (bypassing cached app files).
- If the same: nothing happens.
- If the page stays open past midnight, the next time staff return to the tab it also refreshes once.

## Technical details
- New `src/utils/accessDailyRefresh.ts`: `shouldRefreshToday(lastDate, now)` using SGT date key; localStorage key `access_last_daily_refresh`.
- Call it at top of `PublicGradingList` (the /access page) in a mount effect, plus a `visibilitychange` listener for the past-midnight case.
- Save the date before reloading to make loops impossible.
- Unit test: same SGT day → no refresh; next SGT day (incl. 23:59 → 00:01 SGT) → refresh.
- Record rule in AGENTS.md.
