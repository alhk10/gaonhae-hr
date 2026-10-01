# Edit the studio rental agreement from the Rates dialog

## What changes
- The "Studio rental rates by branch" dialog in /access gets two tabs: **Rates**, which is the current table, and **Agreement**.
- The Agreement tab has a large text box with the full agreement wording, plus Save and "Reset to default" buttons.
- Placeholders such as {branch}, {renter_name}, {nric_uen}, {contact}, {hourly_rate}, {discounted_rate}, {threshold}, {deposit} and {law_country} are listed above the box. They are filled in automatically on the /rental form, so one wording works for every branch with that branch's rates.
- A live preview below the box shows the agreement filled in for a chosen branch.
- Only the all-branch password (Hp97533488) can edit the agreement. Branch passwords can view it but not edit it.
- New bookings use the saved wording. Each past booking keeps the exact agreement text it was signed with, and the signed-agreement PDF shows that text.

## Technical details
- Store the template in `system_settings` under the key `studio_rental_agreement_template`. Read it through a public SECURITY DEFINER RPC `get_studio_rental_agreement_template` and save it through `admin_save_studio_rental_agreement_template(p_text, p_actor)`.
- The current hard-coded text becomes the default template, using placeholders. `buildAgreementText` takes the template and replaces the placeholders, falling back to the default when nothing has been saved.
- `PublicStudioRental` loads the template before rendering the agreement. `submit_studio_rental` still stores the rendered text in `agreement_text`, so past signatures stay unchanged.
- In the UI, wrap the settings dialog body in shadcn Tabs and widen the dialog when the Agreement tab is open.
