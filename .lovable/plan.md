# Relax first name matching on /hello identify step

## Change

Update `match_student_by_identity` RPC so the first name comparison is a **prefix / token match** instead of strict equality. The last name, branch, and the existing DOB-or-(gender+contact) rules stay the same.

Examples that should now match a stored student with `first_name = 'ARIA YI NING'`, `last_name = 'YEO'`:

- Input first name `Aria` → match (first token matches)
- Input first name `Aria Yi` → match (prefix matches)
- Input first name `Aria Yi Ning` → match (full match, unchanged)
- Input first name `Yi` → no match (not a prefix)
- Input first name `Arianna` → no match (token boundary required)

Last name stays strict (case-insensitive, trimmed) to keep matching safe.

## SQL (technical)

Replace the first-name predicate in the WHERE clause:

```sql
-- before
AND upper(trim(s.first_name)) = upper(trim(p_first_name))

-- after: input must equal the stored first name OR be a whole-word prefix of it
AND (
  upper(trim(s.first_name)) = upper(trim(p_first_name))
  OR upper(trim(s.first_name)) LIKE upper(trim(p_first_name)) || ' %'
)
```

The `' %'` suffix enforces a word boundary so `Aria` matches `ARIA YI NING` but `Ari` does not match `ARIA`, and `Arianna` does not match `ARIA YI NING`.

Everything else in the function (norm CTE, last name check, branch check, DOB rule, gender+email/phone rule, `LIMIT 1`) remains identical to the current version.

## Out of scope

- Fuzzy matching for typos.
- Relaxing last name matching.
- Matching on middle-name-only input (e.g. `Yi`).
