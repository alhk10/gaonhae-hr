# Remove old public forms (/hello replaces them)

## Changes
1. Remove the /pay, /grading, /comps, /guards and /fees pages, with no redirect. Visiting them will show the normal "page not found" screen. Old QR codes and links to them will stop working.
2. /hello is not changed. Its built-in school fees, grading, competition and guards options keep working.
3. /seminars, /register, /rental and /perthcomp stay as they are.
4. Staff screens in /access (logs, matching, verification) are untouched, so earlier submissions still show and can be processed.

## Technical details
- In `src/App.tsx`, delete those five routes and their now-unused page imports. Keep `CompetitionRegistrationForm` and the services because /hello and staff screens use them. Delete page files only if nothing else imports them.
- Remove /grading, /fees, /comps and /guards from `public/sitemap.xml`.
- Check: the five paths show Not Found, and /hello loads with no console errors.
