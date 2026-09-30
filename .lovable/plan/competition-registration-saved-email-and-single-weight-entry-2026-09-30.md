# Competition registration: saved email and single weight entry

## Outcome
When a recognized student opens Register for Competition in `/hello`, the email field starts with their saved Email 1 rather than the address typed to identify them. The form no longer asks for weight twice; a selected Kyorugi category keeps its existing required weight field.

## Changes
1. Load Email 1 from the student's saved personal details through the existing session-validated `/hello` lookup when opening the competition form. Keep the field editable; if no saved Email 1 exists, leave it blank for the parent to enter.
2. Remove the standalone optional “Weight (kg)” field from the shared competition form used by `/hello` and `/comps`. Keep the weight input attached to each selected weight-requiring category, including its required-field validation and submitted category weight.
3. Check both `/hello` and `/comps` forms: recognized-student email prefill, manual email entry, Kyorugi weight validation, and submission payload behavior.

## Technical details
- The shared form is `CompetitionRegistrationForm`; `/hello` currently passes its identification-form `email` as prefill. The session-validated personal-info lookup exposes primary `email` and alternate emails but currently loads only on the personal-information screen; enable it for competition without exposing another student's details.
- The redundant standalone weight currently submits `weight_kg` separately from category-specific `extra_lines[].weight_kg`. Remove its visible input and do not infer a general weight from unrelated categories; keep the category payload unchanged.
- No database changes are needed for these form and prefill changes.
