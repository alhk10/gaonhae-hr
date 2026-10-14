# Perth 2026: replace "invited clubs" with "open to all"

## What changes

1. **Website `/perthcomp` – competition rules.** Under "1. Eligibility", the line "Open to competitors from invited clubs only." becomes "Open to all clubs — anyone may enter."
2. **Website `/perthcomp` – registration form.** The Club field placeholder "Select your invited club" becomes "Select your club".
3. **Social caption.** A new caption file keeps every detail the same but reads "Open to all" instead of "Invited clubs".
4. **Instagram square 4 (competition).** A new version replaces the date line "Sunday 29 November 2026 · Invited clubs" with "Sunday 29 November 2026 · Open to all". Logo, divisions, belt categories, limits, pricing and the registration bar stay as they are.

## Notes

- Nothing else needs unlocking: the form already lets anyone type their own club through "Other / add a new club", so no server-side rule blocks anyone from entering.
- Current caption and square versions are kept as backups; the new ones are saved alongside them.
- The event memory note will record that the competition is open to all clubs, so it isn't reintroduced later.

## Technical details

- `src/pages/public/PublicPerthComp.tsx`: the eligibility bullet (line 252) and the club `SelectValue` placeholder (line 298).
- New caption written to `/mnt/documents/perth-2026-instagram-caption_v5.txt`; regenerated square to `/mnt/documents/perth-2026-instagram-4-poomsae-competition_v6.png`.
- Memory update at `mem://features/perth-comp-2026`: competition open to all clubs.
- Verification: re-read the two edited lines, confirm the build is clean, and inspect the regenerated square for spelling and legibility before delivering.
