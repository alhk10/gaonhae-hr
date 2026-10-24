## Competition event settings: "At least one option" and T-shirt size

### 1. "At least one option" checkbox
- A new checkbox in the event settings dialog, under the Categories and Other sections: **Require at least one option**.
- When it's ticked, people registering (in `/hello` and the staff import form) can't submit until they've selected at least one item from Categories or Other combined. They see "Please select at least one option."
- When it's unticked, nothing changes from today.

### 2. "T-shirt size" checkbox
- A new checkbox: **Ask for T-shirt size**.
- When it's ticked, the registration form shows a required **T-shirt size (by height)** dropdown with sizes 100, 110, 120, 130, 140, 150, 160, 170, 180, 190 and 200 (cm).
- The chosen size is saved with the registration and shown in the staff Competitions list and its CSV/PDF exports.

### Technical details
- Migration: add `require_one_option boolean default false` and `tshirt_size_enabled boolean default false` to `competition_events`, and `tshirt_size text` to `competition_payment_submissions`. Extend `admin_upsert_competition_event` and the public event list/submit functions to read and store these. The submit function rejects a submission with no options when required, or with no or an invalid size when the size field is enabled.
- `CompetitionEventsSettingsDialog.tsx`: add the 2 checkboxes to the form state and save.
- `CompetitionRegistrationForm.tsx` and the service: add the dropdown and validation, and send `tshirt_size`.
- Staff Competitions list: show a size label, and include size in the exports.
- Add a test for the size list and the at-least-one rule.
