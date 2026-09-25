# Make date of birth required on the /hello welcome form

## What changes

On the /hello welcome form (the "Welcome to Gaonhae Taekwondo" screen):

1. **Date of birth becomes required**
   - Label changes from "Date of birth (recommended)" to "Date of birth *".
   - The Continue button now requires day, month and year to be selected. If any is missing, the parent sees "Please fill first name, date of birth and branch".
   - The fallback that let parents skip the birth date by filling gender plus email or contact number is removed — the birth date is always needed.

2. **Simpler labels for the other fields**
   - "Gender (optional)" → "Gender"
   - "Email (optional)" → "Email"
   - "Contact number (optional)" → "Contact number"
   - These three stay optional; only the wording is removed.

## Technical details

- File: `src/pages/public/PublicHelloChat.tsx`
- `handleIdentify` (~line 726): replace the `!dob && !hasAltIdentity` check with a plain `!dob` requirement and update the error message; drop the now-unused `hasAltIdentity`.
- Labels at ~lines 1479, 1519, 1530, 1537 updated as above.
- No database changes. The public registration form (/register) already requires a birth date and is untouched.
