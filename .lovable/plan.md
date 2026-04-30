## Problem

Clicking **Generate** in the AI Image Generator on `/social/create` shows: "Failed to send a request to the Edge Function".

Root cause: the `social-generate-image` edge function exists in the repo (`supabase/functions/social-generate-image/index.ts`) but was **never actually deployed** to Lovable Cloud. A direct curl returns `404 NOT_FOUND`, and there are zero log entries for the function.

## Fix

1. **Deploy `social-generate-image`** to Lovable Cloud so the gateway can route to it.
2. **Verify deployment** with a direct curl test (expect 401 Unauthorized for an unauthenticated call — proving the function is live).
3. **Test end-to-end** from the preview: pick a caricature, enter a scene prompt, click Generate, and confirm the image attaches to the post.
4. **Improve the client error toast** in `AiImageGenerator.tsx` so future failures surface the actual error from the edge function (status + message) instead of the generic Supabase wrapper text — makes debugging far easier next time.

## Technical notes

- No code changes to `index.ts` itself are needed — the function source is correct (uses `google/gemini-2.5-flash-image` via Lovable AI Gateway, validates superadmin, uploads to `social-media` bucket, audits to `sm_ai_generations`).
- No `config.toml` edit needed — defaults are fine (verify_jwt handled in code via `auth.getUser()`).
- The `LOVABLE_API_KEY` secret is already provisioned (used by `social-generate-caption`).
- After deploy, rate-limit (429) and credit-exhausted (402) responses are already handled and surfaced.
