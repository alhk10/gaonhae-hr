## Root cause

The grading card **file** did upload to storage (`payment-proofs/competition/e2577869-.../grading-card-...jpg`), but the row's `grading_card_urls` array in `competition_payment_submissions` is still `[]`.

`PublicGradingList` runs anonymously — it uses a client-side password gate, not Supabase auth. Reads work because they go through `SECURITY DEFINER` RPCs (`get_public_competition_list`), but the grading-card save path bypasses that pattern:

```ts
// competitionPaymentSubmissionService.ts
await supabase.from('competition_payment_submissions')
  .update({ grading_card_urls: merged })
  .eq('id', submissionId);   // RLS silently blocks — 0 rows, no error
```

RLS policy on `competition_payment_submissions` only allows UPDATE for `has_branch_access(...)` or `superadmin`. Anonymous callers match neither, so PostgREST returns success with 0 rows updated — the toast says "Uploaded", but nothing persists. The file is orphaned in the bucket.

Every other admin action on this page (slot, branch, display name, verify, etc.) already uses a `SECURITY DEFINER` RPC exactly for this reason (see `admin_update_grading_submission_slot`). The three grading-card writes were missed.

## Fix

### 1. Add SECURITY DEFINER RPCs (migration)

Mirroring the existing admin_* pattern:

```sql
CREATE OR REPLACE FUNCTION public.admin_append_competition_grading_cards(
  p_id uuid, p_new_urls text[]
) RETURNS text[]
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.competition_payment_submissions
     SET grading_card_urls = COALESCE(grading_card_urls, '{}') || p_new_urls,
         updated_at = now()
   WHERE id = p_id
   RETURNING grading_card_urls;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_competition_grading_cards(
  p_id uuid, p_urls text[]
) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.competition_payment_submissions
     SET grading_card_urls = p_urls, updated_at = now()
   WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION public.admin_replace_competition_grading_card_at(
  p_id uuid, p_index int, p_new_url text
) RETURNS text[]
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.competition_payment_submissions
     SET grading_card_urls =
           grading_card_urls[1:p_index] ||
           ARRAY[p_new_url] ||
           grading_card_urls[p_index+2:array_length(grading_card_urls,1)],
         updated_at = now()
   WHERE id = p_id
     AND p_index >= 0
     AND p_index < COALESCE(array_length(grading_card_urls,1),0)
   RETURNING grading_card_urls;
$$;

GRANT EXECUTE ON FUNCTION public.admin_append_competition_grading_cards(uuid, text[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_competition_grading_cards(uuid, text[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_replace_competition_grading_card_at(uuid, int, text) TO anon, authenticated;
```

(Consistent with `admin_update_grading_submission_slot` etc., which are also callable from the anonymous public page behind the client password gate.)

### 2. Switch service to use the RPCs (`src/services/competitionPaymentSubmissionService.ts`)

- `adminUploadCompetitionGradingCards`: after storage uploads, call `admin_append_competition_grading_cards` instead of the read-then-update block.
- `adminSetCompetitionGradingCards`: call `admin_set_competition_grading_cards`.
- `adminReplaceCompetitionGradingCardAt`: after upload, call `admin_replace_competition_grading_card_at`.
- All three throw if the RPC returns an error or (for append/replace) an empty/null array — so a silent no-op becomes a visible toast error.

### 3. Backfill Varina's row

One-off SQL (part of the same migration) to attach the already-uploaded file so the user doesn't have to re-upload:

```sql
UPDATE public.competition_payment_submissions
   SET grading_card_urls = ARRAY[
     (SELECT (storage.create_signed_url(
        'payment-proofs',
        'competition/e2577869-9f11-4522-852d-5b1f866917b6/grading-card-1784088285410-0.jpg',
        60*60*24*365*5
      )).signed_url)
   ]
 WHERE id = 'e2577869-9f11-4522-852d-5b1f866917b6'
   AND (grading_card_urls IS NULL OR array_length(grading_card_urls,1) IS NULL);
```

(If the signing helper isn't available in SQL, generate the signed URL client-side once after the RPCs land and call `admin_set_competition_grading_cards` manually — I'll include whichever variant works in the migration.)

## Out of scope

No UI changes — dialogs, columns, and buttons stay as they are. Certificate/proof/signature/indemnity/passport paths are unaffected (certificates are written by the public submit RPC, not by this admin path).
