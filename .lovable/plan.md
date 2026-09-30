# Reuse competition photo and certificate in /hello

## Experience
- In the recognized-student `/hello` competition form, add separate “Save photo to personal information for future use” and “Save certificate to personal information for future use” switches beside their respective uploads. Each defaults on when a new file is selected; switching off uses the file for this registration only.
- Keep the existing saved passport photo available automatically for photo-required events. Save a newly uploaded photo to the student's personal information only when its switch is on; otherwise do not replace the saved photo.
- For Poom/Dan entries requiring a certificate, show the student's saved certificate if available, let them use it or upload a replacement, and save a newly uploaded certificate only when its switch is on. Preserve the certificate as a separate competition-submission attachment even if it is also saved to the student.
- Show the saved photo and certificate with preview and replacement controls in `/hello` Update Personal Information. Keep standalone `/comps` uploads submission-only; no save switches or automatic student-profile lookup there.

## Technical approach
- Store the student's reusable certificate reference separately from `certificate_name` (which is a name, not a file). Use private Supabase storage and server-validated recognized-student sessions to upload and issue short-lived previews for both file types. Continue treating the existing passport-photo path as the saved photo reference.
- Make saving opt-in per selected upload (default on), verify file type/size server-side, and avoid granting anonymous direct access to private student files. Resolve saved files afresh for each competition submission, then upload the submission's own attachment so later profile replacements do not alter past entries.
- Keep profile and submission saves consistent on failure: report errors, avoid incorrectly claiming a file was saved for reuse, and do not lose unsaved form data.

## Verification
- Check photo-only, certificate-required, existing-saved-file, replace, and switch-off cases in `/hello`; confirm standalone `/comps` stays unchanged. Verify rejected/invalid student sessions cannot read or overwrite saved files, and inspect both narrow and desktop layouts.
