# Send old public forms to /hello

## Goal
/hello becomes the single place to pay grading, register for competitions and buy guards/accessories. The standalone links open /hello instead.

## Changes
1. /pay, /grading, /comps and /guards open /hello instead of their old forms. Old QR codes and shared links keep working; they just land on /hello.
2. /hello itself is not changed. Its built-in competition form keeps working as it does now.
3. **/seminars stays as it is for now.** /hello has no seminar option yet, so redirecting it would leave students with nowhere to register. If you want, a later step can add Seminars to /hello and then redirect /seminars too.
4. Staff screens in /access (logs, matching, verification) are untouched, so earlier submissions still show and can be processed.

## Technical details
- In `src/App.tsx`, change those four routes to `<Navigate to="/hello" replace />`. Keep the page components in the codebase because /hello and staff screens reuse parts of them.
- Remove the four paths from `public/sitemap.xml` if they're listed.
- Check: each path ends up at /hello, and /hello loads with no console errors.
