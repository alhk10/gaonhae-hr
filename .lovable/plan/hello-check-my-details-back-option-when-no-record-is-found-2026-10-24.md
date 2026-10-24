# /hello: "Check my details" back option when no record is found

On the "We couldn't find your record with the details provided." step, add a third button under Help find my account and Others:

- **Back – check my details** (outline button with a back arrow)
- Takes the parent back to the details form, with name, date of birth and branch still filled in so they can fix typos (e.g. "HUIWEN" vs "HUI WEN") and try again.
- Add a short hint above the buttons: "Please check your name spelling, date of birth and branch."

## Technical details
- `src/pages/public/PublicHelloChat.tsx`, `stage === 'choice'` block (~L2083): add a button calling `goTo('identify')`; the form state is kept, so the fields stay filled in.
