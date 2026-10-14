# Add contact email to the Perth page

## What changes

A contact line appears on `/perthcomp`, directly under the "Register & pay" button:

**Need help? Please email perth.gaonhaetaekwondo@gmail.com**

The email address is a clickable mail link, so tapping it opens the visitor's mail app with the address already filled in. It uses the same text styling as the rest of the page and stays readable on phones.

Nothing else on the page moves or changes: event details, seminars, competition rules, the two download links, the registration form and the staff log are untouched.

## Technical details

- File: `src/pages/public/PublicPerthComp.tsx` — a small centred line added immediately after the "Register & pay" button inside the main content area.
- Markup: an `<a href="mailto:perth.gaonhaetaekwondo@gmail.com">` with a mail icon, sized to match the existing text styles (no new colours or hard-coded hex values, so it follows the page theme).
- No database, server function or pricing change is needed — this is presentation only.
- Verification: build output checked, then the page opened in a browser to confirm the line renders, wraps correctly on a narrow phone viewport, and the link points at the right address.
