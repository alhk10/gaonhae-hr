# Add "Add trial student" button

In the `/access` Students tab, add an **Add trial student** button beside the existing **Add student** button.

## What it does
- Opens the same new-student dialog, with Status already set to **trial**.
- Staff can still change the status before saving if needed.
- The existing Add student button works as before and defaults to active.
- Trial students then follow the existing automatic rules: they become active when a class invoice is created, and inactive after 14 days with no invoice or payment.

## Technical details
- `AddStudentDialog`: add an optional `status` to `AddStudentInitialValues` and apply it when the dialog opens. Reset to `active` when the dialog closes.
- `StudentsTab`: add a second outline button that opens the dialog with `initialValues={{ status: 'trial' }}`. The normal button opens it with no initial values.
