# Catch existing students on the registration form

## What happens today
Someone who is already enrolled can fill in the whole registration form again and submit it,
creating a duplicate record that staff have to merge later.

## What changes

On the public registration page, as soon as first name, last name, date of birth, gender and
branch are all filled in, the page quietly checks whether a student with those details already
exists at that branch.

If a match is found, a message appears:

- Title: "We already have a record for this student"
- Body: shows the matched student's name, branch and birth date, and asks
  "Are you trying to update your details?"
- Buttons:
  - **Yes, update my details** — sends them to /hello, where the same details are used to
    recognise them automatically and the Update Personal Information screen opens straight away.
  - **No, this is a new student** — closes the message and lets them keep registering as normal.

Details:
- The check runs once per set of details, and again if they change any of the five fields.
- If no match is found, nothing appears and the form behaves exactly as now.
- If the check fails (e.g. connection problem), nothing appears — registration is never blocked.

## /hello side

/hello accepts the passed-through details in the link, recognises the student without the
person retyping anything, and lands directly on Update Personal Information. If recognition
fails for any reason, it falls back to the normal /hello starting screen with the fields
pre-filled.

## Technical notes

- `src/pages/StudentRegistration.tsx`: debounced (about 600ms) call to the existing
  `match_student_by_identity` RPC via `matchStudentByIdentity`, guarded so it only fires when
  all five fields are set; result shown in an AlertDialog. "Yes" navigates to
  `/hello?first_name=..&last_name=..&dob=..&gender=..&branch_id=..&action=personal_info`.
- `src/pages/public/PublicHelloChat.tsx`: read those params with `useSearchParams` on mount,
  pre-fill the identify fields, and when `action=personal_info` auto-run `handleIdentify`;
  on a successful match go to the `personal_info` stage instead of `matched`.
- No database or schema change; the matching RPC is already public-callable.
