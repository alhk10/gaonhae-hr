# AI Document tab in /access

Add an **AI Document** tab to `/access` that turns a few typed details into on-brand Gaonhae Taekwondo marketing artwork and copy — posters, Instagram squares, and Instagram reel covers.

## What you'll see

A new tab (after Summary) visible only once the `Hp84311884` admin password has been entered, same gate as the Registered column.

Left side — a short form:
- Format: Poster (A4 portrait), Instagram square (1:1), Instagram reel (9:16)
- Branch (optional, from the branch list)
- Headline / event name
- Date, time, venue (optional)
- Key details / notes free-text box
- Call to action (e.g. "Scan to register")
- Optional extra art direction ("add a trophy", "teen class, no young kids")

Right side — the result:
- Generated artwork, rendering progressively as it draws
- Generated copy (headline, body, Instagram caption with hashtags) in editable text boxes
- Buttons: **Regenerate image**, **Regenerate copy**, **Download PNG**, **Download PDF** (poster only), **Copy caption**
- A "Recent generations" strip so past artwork can be reopened or re-downloaded

## The house style

Every image request is wrapped in the fixed Gaonhae standard design prompt so output stays consistent without you retyping it: minimalist white-background layout, Korean-flag red `#D62828` and blue `#005BBB` accents, subtle Korean cloud motifs, cute high-quality cartoon children in dobok performing poomsae/kicks/bows, bold modern sans-serif with short impactful headings, premium-but-family-friendly feel. Your typed details are appended as the subject; the extra art-direction box is appended last.

Two things to flag up front:
- AI image models are unreliable at rendering exact text, so the artwork is treated as the visual and the headline/date/CTA text is generated separately for you to place or edit. Expect to regenerate a couple of times for a clean poster.
- The logo cannot be reproduced faithfully by the image model. If you upload the official logo file once, the app will overlay it on the exported PNG/PDF rather than asking AI to draw it.
- "Reels" here means a 9:16 cover frame plus a written hook/script — the app generates stills and copy, not video.

## Technical detail

**Backend** — one new Supabase edge function `ai-marketing-asset` (CORS, zod-validated body, uses `LOVABLE_API_KEY`):
- `mode: "copy"` → `google/gemini-3.6-flash` via the Lovable AI Gateway, structured output for `{ headline, subheadline, body, caption, hashtags[] }`.
- `mode: "image"` → `POST https://ai.gateway.lovable.dev/v1/images/generations` with `openai/gpt-image-2`, `quality: "low"`, `stream: true`, `partial_images: 1`, size chosen per format (`1024x1536` poster, `1024x1024` square, `1024x1536` reel). The SSE body is forwarded straight to the browser.
- Surfaces 429 / 402 / content-policy errors verbatim so the UI can show a real message.

**Frontend**
- `src/lib/ai/gaonhaeBrandPrompt.ts` — the fixed brand prompt + format-specific composition rules + prompt builder.
- `src/components/grading-list/AiDocumentTab.tsx` — the form, streaming preview (`eventsource-parser` + `flushSync`, blurred partial frames), copy editors, and export buttons.
- `src/pages/public/PublicGradingList.tsx` — register the tab, gated on `unlockLevel === 'full'`.
- PNG export from the returned base64; PDF export via the existing jsPDF setup used by the other PDF generators.

**Storage** — new `ai_marketing_assets` table (id, branch_id, format, prompt inputs jsonb, generated copy jsonb, image_path, created_by_email, created_at) with grants + RLS matching the other `/access` public-admin tables, and images written to a `marketing-assets` folder in the existing `payment-proofs` bucket so the same signed-URL helpers work.
