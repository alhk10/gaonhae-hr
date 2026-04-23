

## Plan: Strip leading `0` after country code on all new student data entry paths

The shared `PhoneInput` already strips leading `0` via `formatPhone` (last migration), so **all UI forms are already safe**: `AddStudentDialog`, `EditStudentDialog`, `AddTrialDialog`, `StudentRegistration` (public `/register`), `StudentEmergencyContacts`. No changes needed there.

The remaining gap is **non-UI write paths** that bypass `PhoneInput`:

1. **CSV bulk import** (`ImportStudentsDialog.tsx`) — writes `row.phone` etc. directly from spreadsheet cells.
2. **CSV import branch in `studentService.ts`** (around line 770) — same.
3. **Defensive layer at the service** — to guarantee no future code path can re-introduce the bug.

### Implementation

**1. New helper in `src/constants/formOptions.ts`**

```ts
/**
 * Normalize a stored phone string by stripping a leading 0 right after a
 * known country code. Safe for: empty, null, no-country-code, already-correct.
 * "+61 0431..." -> "+61 431..."
 * "+65 91234567" -> "+65 91234567" (unchanged)
 * "91234567" -> "91234567" (unchanged)
 */
export function normalizeStoredPhone(value: string | null | undefined): string | null | undefined
```

Implementation reuses the same regex as the migration (the recognized CC list) and only mutates strings that match `^\+CC ?0`.

**2. `src/components/sales/ImportStudentsDialog.tsx`**

Apply `normalizeStoredPhone` to the four phone-bearing columns when building each row before insert: `phone`, `whatsapp` (if present), `emergency_contact_phone`, `emergency_contact_2_phone`. (~4 lines added in the row mapper near line 207–233.)

**3. `src/services/studentService.ts`**

- In `createStudent` payload (line ~370–385): wrap `phone`, `whatsapp`, `emergency_contact_phone`, `emergency_contact_2_phone` with `normalizeStoredPhone(...)`.
- In `updateStudent` (mirror the same fields).
- In the legacy CSV import branch (line ~770–782): wrap `phone` and `emergency_contact_phone` with the helper.
- In the `student_emergency_contacts` insert (line ~412): wrap `phone`.

**4. `src/services/studentRegistrationService.ts`**

In `createRegistration` / `updateRegistration` (and the merged write at line ~107–121), wrap the four phone fields with `normalizeStoredPhone`. This covers the public `/register` form as a defensive belt-and-braces.

### Files affected

- `src/constants/formOptions.ts` — add `normalizeStoredPhone` helper.
- `src/components/sales/ImportStudentsDialog.tsx` — normalize 4 phone fields in CSV row mapping.
- `src/services/studentService.ts` — normalize phone fields in create/update payloads, emergency contact insert, and legacy CSV branch.
- `src/services/studentRegistrationService.ts` — normalize phone fields on create/update.

### Verification

1. **CSV import**: import a row with `phone = +61 0412345678` → DB stores `+61 412345678`.
2. **Create student via dialog**: type `0412345678` in PhoneInput with `+61` selected → already saves `+61 412345678` (existing behavior, unchanged).
3. **Public registration `/register`**: same as above.
4. **Approve a registration that contains `+61 04…`** → resulting student row stores normalized `+61 4…`.
5. **Singapore numbers** (e.g. `+65 91234567`) remain untouched — no leading `0` after `+65` to strip.
6. **Numbers without country code prefix** (legacy) pass through unchanged.

### Out of scope

- Migrating already-stored values (already done in the prior migration; current DB count of `+CC 0…` rows = 0).
- Employee form (no `employees.phone` rows currently affected; uses the same `PhoneInput`).
- Changing `parsePhone` or display formatting.

