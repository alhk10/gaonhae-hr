# Remove old public forms (/hello replaces them)

## Changes
1. Remove the /pay, /grading, /comps and /guards pages, with no redirect. Visiting them will show the normal "page not found" screen. Old QR codes and links to them will stop working.
2. /hello is not changed. Its built-in grading, competition and guards options keep working.
3. /seminars, /fees, /register, /rental and /perthcomp stay as they are.
4. Staff screens in /access (logs, matching, verification) are untouched, so earlier submissions still show and can be processed.

## Technical details
- In `src/App.tsx`, delete those four routes and their now-unused page imports. Keep `CompetitionRegistrationForm` and the services because /hello and staff screens use them. Delete page files only if nothing else imports them.
- Remove /grading, /comps and /guards from `public/sitemap.xml`.
- Check: the four paths show Not Found, and /hello loads with no console errors.
