# /perthcomp — Register & pay as a pop-up dialog

## Goal
Replace the inline "Register & pay" card at the bottom of `/perthcomp` with a button that opens the full registration form in a pop-up dialog. The page then shows only the event information, and the form opens on demand.

## Current state
- `src/pages/public/PublicPerthComp.tsx` renders the whole registration form inline in a `Card` titled "Register & pay" (lines ~229–314), including participant details, seminar/event selection, totals, payment info, proof upload, indemnity, signature and submit.
- A successful submit replaces the whole page with a "Registration received" confirmation card that includes the PDF confirmation download.

## Changes (all in `src/pages/public/PublicPerthComp.tsx`)
1. Remove the inline "Register & pay" Card from the page body.
2. Add a prominent **Register & pay** button in its place (same red accent styling as the current submit button).
3. Wrap the existing form content in the shared `Dialog` component:
   - Wide content (`max-w-2xl`-class dialog) with `max-h-[85vh]` internal scrolling so the long form stays usable on mobile and desktop.
   - Title "Register & pay", close button, all existing fields and validation unchanged.
4. On successful submit, close the dialog and show the existing "Registration received" confirmation screen exactly as today (page-level card with Download Confirmation PDF and Register another participant).
5. No changes to pricing, eligibility rules, capacity/deadline checks, RPCs, staff log, confirmation PDF, or the theme.

## Verification
- TypeScript check and preview build pass.
- Playwright: open `/perthcomp`, confirm the page shows info cards + the Register & pay button, open the dialog, confirm the form fields render, and close it.
