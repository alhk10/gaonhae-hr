## Goal

On `/hello`, make student matching tolerant of compound names, allow the user to type the full name into "First name" alone, and make "Last name" optional. Also auto-capitalise the first/last name inputs as the user types.

## Changes

### 1. Token-based name matching in `match_student_by_identity` RPC

New migration that `CREATE OR REPLACE`s the RPC. Signature, return columns, `SECURITY DEFINER`, and `search_path` unchanged.

Split both the typed input and each stored student's `first_name` + `last_name` into uppercase whitespace-delimited tokens. A student matches when:

- **First-name check:** at least one token from the typed First name field appears in the union of the stored student's first-name and last-name tokens. So typing `Earl`, `John`, `Earl John`, `Earl Lucero`, or `John Lucero` all match a student stored as `Earl John` / `Lucero II`.
- **Last-name check:** if the typed Last name is non-empty, at least one of its tokens must also appear in that same union. If blank, this check is skipped.

Branch, and the DOB **or** gender + email/phone fallback conditions, remain exactly as today.

### 2. `/hello` identify form — `src/pages/public/PublicHelloChat.tsx`

- First name and Last name `Input`s: `onChange` stores `e.target.value.toUpperCase()` immediately; remove the `onBlur` uppercase handler.
- Last name label changes from `Last name *` to `Last name` and the submit-guard no longer requires it. First name and branch stay required; DOB stays "recommended".
- Pass `last_name` as an empty string when blank; the RPC treats that as "skip last-name check".

## Technical notes

Token comparison uses `regexp_split_to_array(upper(trim(...)), '\s+')` and the array-overlap operator `&&` against the union of each student's first-name and last-name token arrays. Empty typed arrays short-circuit the corresponding check.

## Out of scope

- Public Student Registration form and other intake forms.
- Fuzzy/typo matching or nickname handling.
- Changing DOB / gender / email / phone fallback logic, or which fields are required beyond making last name optional.
