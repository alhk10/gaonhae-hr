## Problem

Kang Seokjun sees "Upload completed but failed to generate file URL" after uploading a claim receipt. The file actually uploads to the `claim-receipts` bucket, but `createSignedUrl()` fails.

## Root cause

The storage RLS policies for `claim-receipts` restrict SELECT (which `createSignedUrl` requires) to:
- admins / superadmin / payroll, OR
- `auth.uid()::text = (storage.foldername(name))[1]` — i.e. the file's first folder must equal the caller's auth user id.

But `src/services/receiptUploadService.ts` uploads to `receipts/<filename>` (hard-coded "receipts" as the first folder). The INSERT policy named "Authenticated users can upload receipts" (granted to `public`) has no path check, so the upload succeeds — but the SELECT policy then fails for non-admin employees, so signed URL generation returns null and the UI shows the red error.

This is why only admin staff can submit claims today and regular employees like Kang Seokjun cannot.

## Fix (frontend only, no DB change needed)

In `src/services/receiptUploadService.ts`:

1. In `uploadReceipt`, fetch the current auth user via `supabase.auth.getUser()` before building the path.
2. If no auth user, return a clear "Please sign in again" error.
3. Change `filePath` from `receipts/${fileName}` to `${authUid}/${fileName}` so it satisfies `(auth.uid())::text = (storage.foldername(name))[1]`.
4. Update `deleteReceipt`'s legacy URL-stripping branch so it still works for both old `receipts/...` paths and new `<uid>/...` paths (no behavior change needed beyond keeping `actualPath` as-is when it doesn't contain the public URL prefix — already handled).

No changes to `claims`/`claim_types` tables, storage policies, or any other service. Existing already-uploaded `receipts/...` files remain readable by admins (who bypass the folder check).

## Verification

- Log in as Kang Seokjun in incognito, go to Submit Claim, upload a JPG/PNG receipt, confirm the preview/URL renders and "Submit Claim" succeeds.
- Confirm superadmin can still view the receipt on the approval screen.
