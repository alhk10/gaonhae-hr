# Highlight the Seminar field on /seminars

Make it obvious that the Seminar selector must be reviewed/chosen before the rest of the form is filled in.

## Changes

In the public seminar registration form (`src/pages/public/PublicSeminarPayment.tsx`), the Seminar field block:

- Wrap the field in a highlighted callout: amber/primary tinted background, ring border, rounded corners, so it visually stands out from the rest of the form.
- Label reads **Seminar *** with a small badge/hint next to it: "Select first".
- Add helper text under the select: "Please confirm you have selected the correct seminar before entering details."
- Keep the current auto-selection of the first active event, but the highlight stays so users notice they may need to change it. When more than one active seminar exists, the helper text is emphasised (amber text) instead of muted.
- Highlight fades to a normal field state once the user actively changes the selection.

No behaviour, data, or validation changes — styling and copy only.
