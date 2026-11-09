# Students list: left-aligned details and colour coding

## Changes
- The second line of each student row (student number, date of birth, email, class/term, certificate name) lines up on the left under the name, instead of centred.
- Colour coding:
  - **Class:** a coloured strip on the left of each row and a coloured class tag, using the same class colours as the Attendance tab (Little Gaonhae, Kids, Teens & Adults, Team Gaonhae).
  - **Term payment:** Paid is green, Unpaid is red (with the amount due), No invoice is grey, Trial is amber.
  - **Grading:** Ready for grading is blue when ticked, Grading paid is green.
  - **Status:** Inactive and withdrawn rows are slightly faded.

## Technical details
- `StudentsTab.tsx` row markup: give line 2 `justify-start text-left` and override the centring from `.access-list-shell` for this list.
- Reuse the Attendance class-colour helper for the left border and the class chip.
- Badge colours use semantic tokens (success, destructive, muted, warning, primary). Add tokens to `index.css`/`tailwind.config.ts` if any are missing.
