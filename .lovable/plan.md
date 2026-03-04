

## Plan: Update Student Registration Form

### Changes to `src/pages/StudentRegistration.tsx`

1. **Hide NRIC/FIN and Passport No. fields** — Remove the NRIC/FIN field (lines 250-253) and Passport No. field (lines 255-258) from the Personal Information card. Change the grid from 3 columns to 2 columns for Gender + DOB row.

2. **Make email mandatory** — Add `*` to the Email label (line 278), add `required` attribute to the email input, and update validation (line 111) to always require email instead of "email or phone".

3. **Add School Policy section** — After the Training Information card, add a new Card with the full school policy text. Include:
   - Title: "Our School Policy"
   - All policy paragraphs as provided
   - A checkbox for "Acknowledgement & Agreement" with the text: "I have read and understood the school policy, and I agree to comply with its terms."
   - A signature box (canvas-based or simple text input styled as a signature field)

4. **Add signature state** — Add `policy_agreed` (boolean) and `signature` (string) to form state. Implement a simple canvas-based signature pad where users can draw their signature, with a Clear button.

5. **Update validation** — Require policy agreement and signature before submission.

6. **Update form reset** — Include new fields in the reset state on "Submit Another Registration".

### Technical Details

- Signature box: Use an HTML `<canvas>` element with mouse/touch event handlers for drawing. Store as base64 data URL.
- Policy text rendered as formatted paragraphs within a scrollable container.
- Remove `nric_passport` and `passport_no` from `uppercaseFields` array since they're no longer in the form.

