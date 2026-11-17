# /hello: every Back restarts and clears

## What changes
- Every Back button on /hello (top arrow, "Back", "Back to menu", "Back – check my details") and the phone/browser back button reload /hello from the very first step.
- All typed details (name, birthdate, branch, gender, email), the matched student, cart/checkout choices and uploaded previews are cleared.

## Technical
- In `src/pages/public/PublicHelloChat.tsx`, replace `goBack` (and inline Back handlers at ~2045, 2239, 2257, 2335, 2389) with `restartHello()` that calls `window.location.replace('/hello')` (full refresh wipes all state and react-query cache).
- Push a history entry on mount and listen to `popstate` to call `restartHello()`, so browser back also resets instead of leaving the page.
- Clear any /hello sessionStorage/localStorage keys, if present, before reload.
