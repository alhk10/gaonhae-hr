# Refresh /access data automatically after saving

## What you'll see
- In any /access tab (Students, Attendance, Grading, Uniforms & Guards, Finance, Settings dialogs and the others), the information on screen updates by itself straight after you save, edit, add, delete, verify or approve something. You won't need to press refresh.
- The page doesn't reload: you stay on the same tab with the same filters and scroll position, and open dialogs stay open. Only the lists and numbers update.
- If a save fails, nothing refreshes and the error message shows as it does now.

## How it works
- After any successful change made from /access, the app reloads the data for the tab you're on, plus any other tab you open later.
- Changes saved close together trigger a single refresh. For example, ticking several attendance boxes quickly gives one refresh, not one per box, so the screen doesn't flicker.

## Technical details
- Add `src/utils/accessAutoRefresh.ts` and pass it as a custom `global.fetch` wrapper. Since `client.ts` is generated and can't be edited, the wrapper is installed by patching `window.fetch` once, early in `App.tsx`, and only reacts to requests to the Supabase URL.
- Writes it reacts to: REST `POST`/`PATCH`/`DELETE`, and `/rpc/` calls whose name matches a change verb (set, save, upsert, update, delete, add, remove, mark, create, insert, verify, approve, reject, refund, match, convert, move, toggle, resolve, submit). Read-only RPCs (get_*, list, search, status) are ignored, so loading data never starts a refresh loop.
- On a 2xx response while the route is `/access`, wait about 400 ms, then call `queryClient.invalidateQueries()` once. Only active queries refetch straight away; others refetch when they're next shown.
- Afterwards, check in the browser: add a custom grading field and tick an attendance mark, confirm each list updates without a manual refresh and the tab and filters stay put, and check the request log shows no repeated refetching.
