# Relax student matching on /hello identify step

## Change

Update `match_student_by_identity` RPC so a student is considered matched if **either** of these holds:

1. **Name + DOB + Branch** all match (current rule, DOB-anchored).
2. **Name + Gender + Branch + (Email OR Phone)** all match (DOB may be wrong, identity proven via contact).

Name match stays case-insensitive on `first_name` and `last_name`. Branch is exact on `branch_id`. Gender is normalized (lower/trim). Email is normalized (lower/trim). Phone matches last-8-digits against `phone`, `emergency_contact_phone`, or `emergency_contact_2_phone`.

## SQL (technical)

```sql
WHERE upper(trim(s.first_name)) = upper(trim(p_first_name))
  AND upper(trim(s.last_name))  = upper(trim(p_last_name))
  AND s.branch_id = p_branch_id
  AND (
    -- Rule 1: DOB matches
    s.date_of_birth = p_dob
    OR
    -- Rule 2: gender + (email or phone) matches
    (
      norm.gender_norm IS NOT NULL
      AND lower(trim(s.gender)) = norm.gender_norm
      AND (
        (norm.email_norm IS NOT NULL AND lower(trim(s.email)) = norm.email_norm)
        OR (norm.phone_digits IS NOT NULL AND (
              right(regexp_replace(COALESCE(s.phone,''), '\D','','g'), 8) = right(norm.phone_digits, 8)
           OR right(regexp_replace(COALESCE(s.emergency_contact_phone,''), '\D','','g'), 8) = right(norm.phone_digits, 8)
           OR right(regexp_replace(COALESCE(s.emergency_contact_2_phone,''), '\D','','g'), 8) = right(norm.phone_digits, 8)
        ))
      )
    )
  )
LIMIT 1;
```

No frontend changes required — `PublicHelloChat.tsx` already passes gender, email, and phone to the RPC.

## Out of scope

- Returning multiple candidates / disambiguation UI.
- Fuzzy name matching (typos).
