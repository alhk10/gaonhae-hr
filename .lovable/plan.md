## Problem

The /comps form shows a bare **"Failed to fetch"** on submit. That string is the raw `TypeError` thrown by the browser when a `fetch()` call cannot complete (network blip, dropped mobile connection, CORS edge case, or the OS killing the request mid-upload).

In `src/services/competitionPaymentSubmissionService.ts → submitCompetitionPayment`, each Supabase Storage `upload()` is handled like this:

```ts
const { error: proofErr } = await withTimeout(supabase.storage.from('payment-proofs').upload(...), 30000, 'Proof upload');
if (proofErr) throw new Error(`Proof upload failed: ${proofErr.message}`);
```

That only wraps the **returned** `{ error }` path. When supabase-js throws a `TypeError("Failed to fetch")` (network failure before the response is parsed), it bypasses the wrapper and bubbles up unchanged — which is exactly what the screenshot shows. So we don't even know which step failed (proof, certificate, indemnity, passport, photo, signature, or the final RPC).

## Fix

Make submission resilient and self-describing in `src/services/competitionPaymentSubmissionService.ts`:

1. **Wrap every upload + RPC in a try/catch** that:
   - Catches both the returned `{ error }` and any thrown `TypeError`/network error.
   - Re-throws with a labeled message, e.g. `"Proof upload failed: Failed to fetch (network)"`, `"Signature upload failed: ..."`, `"Submission RPC failed: ..."`. The user (and console) will see which step actually broke.

2. **Add a small retry helper** (`retry(fn, { attempts: 3, backoffMs: 800 })`) and use it for each storage `upload()`, `createSignedUrl()`, and the final `supabase.rpc('submit_competition_payment', ...)`. Retry only on network-class failures (`TypeError`, `Failed to fetch`, timeouts, HTTP 5xx) — never on validation errors. This handles transient mobile-network drops, which is the most likely root cause given a 358KB proof file and otherwise healthy bucket policies.

3. **Convert data-URL signatures to a Blob without `fetch()`** — decode base64 → `Uint8Array` → `new File([...], 'signature.png', { type: 'image/png' })`. This removes one fragile `fetch()` call entirely and avoids a known Android WebView failure mode where `fetch(dataUrl)` rejects with "Failed to fetch" on large canvas PNGs.

4. **Keep the existing 30s `withTimeout`** but lower per-upload timeout to 20s and let the retry layer cover transient timeouts; the final RPC stays at 15s.

5. **Surface the labeled error** in `PublicCompetitionPayment.tsx`'s `submitError` (already wired) and also `console.error` the original cause for prod debugging.

Apply the same three changes to `src/services/seminarPaymentSubmissionService.ts` (mirror file) so the seminar form benefits from the same hardening.

## Out of scope

- No changes to RLS, storage bucket config, RPC, or the public form's UI/fields.
- No schema or migration changes.
- No retry on the RPC's *business* errors (duplicate reference, validation), only on network failures.

## Verification

- Submit a /comps form with throttled "Slow 3G" in DevTools → expect retries, then either success or a labeled error like "Proof upload failed: …".
- Force-fail by going offline mid-submit → expect a clear `"<step> failed: Failed to fetch"` message instead of a bare one.
- Happy path with normal network → unchanged behavior, single attempt, success.
