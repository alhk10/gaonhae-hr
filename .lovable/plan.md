

## Plan: Strip leading `0` after country code from all party phone/WhatsApp numbers

### What's happening

International numbers in `students`, `student_registrations`, and `student_emergency_contacts` were stored with the local trunk prefix `0` retained after the country code (e.g. `+61 0431790857`). E164-style format requires this `0` to be dropped (`+61 431790857`).

### Affected data (current counts)

| Table | Field | Rows to fix |
|---|---|---|
| students | phone | 41 |
| students | whatsapp | 41 |
| students | emergency_contact_phone | 41 |
| students | emergency_contact_2_phone | 4 |
| student_registrations | phone | 41 |
| student_registrations | whatsapp | 41 |
| student_registrations | emergency_contact_phone | 41 |
| student_registrations | emergency_contact_2_phone | 4 |
| student_emergency_contacts | phone | 41 |
| employees | phone | 0 |

All matched rows are `+61 0…` (Australia). No `+65` (Singapore), `+60`, etc. are affected. Format pattern to strip: country code + space + `0` → country code + space.

### Migration

One SQL migration that, for each `(table, column)` pair above, runs:

```sql
UPDATE <table>
SET <column> = regexp_replace(
  <column>,
  '^(\+(?:65|61|60|62|86|91|63|66|84|81|82|44|64|49|33|39|34|95|971|966|852|886|855|856|1))[\s]?0',
  '\1 ',
  ''
)
WHERE <column> ~ '^\+(65|61|60|62|86|91|63|66|84|81|82|44|64|49|33|39|34|95|971|966|852|886|855|856|1) ?0';
```

The `WHERE` filter ensures only valid country-code prefixed rows are touched (no false positives on local-format numbers, no NULLs). The replacement preserves the country code and inserts a single space before the trunk-stripped local number.

### Forward prevention (UI input normalization)

Update `formatPhone` in `src/constants/formOptions.ts` to strip a leading `0` from `localNumber` before joining, so any future entry like `0431790857` is saved as `431790857`. This is a one-line change and prevents the issue from re-occurring across all party forms (student, registration, emergency contacts, employee — all use the shared `PhoneInput`).

```ts
export function formatPhone(countryCode: string, localNumber: string): string {
  if (!localNumber) return '';
  const cleaned = localNumber.trim().replace(/^0+/, '');
  return `${countryCode} ${cleaned}`.trim();
}
```

`parsePhone` already handles display correctly; no other UI changes needed.

### Verification

1. After migration: re-run the count query — all rows should return 0.
2. Sample check: the 5 sample rows shown should display as `+61 431790857`, `+61 401288657`, etc.
3. Edit a student in Branch Dashboard → Students → confirm phone displays in `PhoneInput` as `+61` flag + `431790857` (no leading 0).
4. Try entering `0412345678` in a fresh phone input → saved as `+61 412345678`.
5. Existing `+65` Singapore numbers remain untouched (none had the `0` issue).

### Files affected

- New migration: backfills 4 columns × `students`, 4 × `student_registrations`, 1 × `student_emergency_contacts`.
- `src/constants/formOptions.ts` — `formatPhone` strips leading `0` from local number.

### Out of scope

- Reformatting numbers that have no country code prefix (none currently exist in the matched set).
- WhatsApp link generation logic (already uses `cleanNumber.replace(/\D/g, '')`, which is unaffected by the leading 0 fix once data is normalized — links will become correct automatically).
- Changing `parsePhone` (still correctly splits `+61 431…`).

