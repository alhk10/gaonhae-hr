# Reusable student passport photo

## What will change

- Add a **Passport-size photo** field to **Update Personal Information** in `/hello`, with a preview and a replace option. Accept common image formats up to 5 MB; show upload and error states without losing unsaved contact edits.
- Save the photo against the **recognized student's** record, separately from name/DOB approval requests. Show the saved photo when returning to the same student's details.
- In `/hello` competition registration, prefill its event-required **Participant Photo** from that student's saved photo. Show which photo will be used and let the parent replace it for that submission. If there is no saved photo, keep the existing required upload. A replacement made in an event form is for that submission only unless the parent changes their profile photo separately.
- Keep `/comps` and `/seminars` standalone forms as manual uploads, as requested: photo reuse is limited to recognized student sessions. Do not treat passport documents, grading cards, signatures, or payment proofs as passport-size portrait photos.

## Technical details

- Reuse `students.passport_photo_url` rather than add another student-photo column. Extend the session-validated `/hello` personal-info read and add a session-validated photo-update flow; do not grant anonymous direct write access to student records or broadly expose the private `student-photos` bucket. Check the deployed bucket/policy state before choosing the upload and signed-preview mechanism.
- Pass only the recognized student's authorized photo reference into the embedded competition form. Make its required-photo validation accept either that saved photo or a newly chosen image, and persist the selected photo on the competition submission through a server-validated association. Preserve existing standalone submission behavior.
- Validate image type/size on both sides, avoid matching by shared family email alone, and ensure a failed upload leaves the previous saved photo intact. Test returning to personal details and submitting an event that requires a photo with both saved-photo and replacement-photo paths; check desktop and phone presentation. External Supabase staff-session checks may remain unavailable in this environment.
