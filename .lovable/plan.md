## Goal

Add a **Caricature Library** so when a post has no media, the AI can generate an image using one of the saved caricatures as a style/character reference.

---

## 1. Caricature Library (new page)

New sidebar entry **"Caricature Library"** at `/social/caricatures` (under Social Media group).

Page lets superadmin:
- **Upload** caricature images (drag/drop or browse, max 10MB, PNG/JPG/WEBP).
- For each caricature: set **name**, **description** (e.g. "Brave young taekwondo boy in white dobok"), **tags** (kid, adult, instructor, kicking, etc.), **branch scope** (All / Perth / Singapore), and **active** toggle.
- **Edit** name/description/tags/active inline.
- **Delete** with confirmation.
- Grid view with thumbnail, name, tag chips, branch badge, active state.

### Storage
- New public bucket: **`social-caricatures`**.
- Path convention: `{branch_or_global}/{caricatureId}.{ext}`.

### Database
New table **`sm_caricatures`**:
- `name` (text, required)
- `description` (text — used as the AI character/style brief)
- `tags` (text[])
- `branch_name` (text, nullable — null = available to all branches)
- `image_url` (text — public storage URL)
- `storage_path` (text)
- `is_active` (boolean, default true)
- `created_by` (text, email)

RLS: superadmin only (read + write), matching the rest of the social module.

---

## 2. AI Image Generation when no media

In **Create Post** (`/social/create`), update the Media card:

- When **no media is uploaded**, show a new section **"Or generate an image with AI"**:
  - **Caricature picker**: dropdown / scrollable grid of active caricatures filtered by current branch (`branch_name = branch OR branch_name IS NULL`).
  - **Image prompt** textarea (auto-prefilled from the post's content type, event, student, notes — editable).
  - **Aspect ratio** select: Square (1:1) / Portrait (4:5) / Story (9:16). Default Square.
  - **Generate image** button.
- Generated image is appended to `media` as a regular `MediaItem` (so existing download/upload/post flow keeps working untouched).
- User can **regenerate** or **remove** like any uploaded media.
- Once any media exists (uploaded or generated), the "Generate" panel collapses behind a "Generate another" link to keep the focus on real media when present.

Flow trigger:
- Button appears only when `media.length === 0` (per the user's "if no media" rule). After generation, user can still add real media on top.

### Edge function: `social-generate-image` (new)

- Auth: superadmin only (same gate as caption function).
- Input: `{ branch, caricature_id, prompt, aspect_ratio }`.
- Loads the caricature row, fetches its `image_url`, and calls Lovable AI Gateway with **`google/gemini-2.5-flash-image`** (Nano Banana) in **edit-image mode** — passing the caricature image + a composed prompt that merges:
  - Caricature `description` (character/style anchor).
  - User prompt (scene description).
  - Brand guardrails (family-friendly, taekwondo, no aggressive language) pulled from `sm_brand_settings`.
  - Aspect ratio hint.
- Receives base64 image, uploads it to **`social-media`** bucket (existing) under `ai-generated/{branch}/{timestamp}.png`, returns `{ url, path }`.
- Logs to `sm_ai_generations` with `mode = 'image'`.
- Handles 429/402 gateway errors with proper toasts on the client.

### New service: `src/services/social/caricatureService.ts`
- `listCaricatures(branch?)`, `createCaricature`, `updateCaricature`, `deleteCaricature`, `uploadCaricatureImage`.

### New service helper: `generateAiImage(input)` in `aiService.ts`
- Wraps `supabase.functions.invoke('social-generate-image', …)`.

---

## 3. Wiring

- Add route in `src/App.tsx`:
  ```
  /social/caricatures → SocialCaricatureLibrary (lazy, inside <SocialRoute>)
  ```
- Add sidebar item in `SOCIAL_MEDIA_GROUP`:
  ```
  { icon: ImageIcon, label: 'Caricatures', path: '/social/caricatures' }
  ```

---

## Technical details

### Database migration

```sql
CREATE TABLE public.sm_caricatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  tags text[] DEFAULT '{}',
  branch_name text,             -- null = global
  image_url text NOT NULL,
  storage_path text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sm_caricatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin full access on sm_caricatures"
  ON public.sm_caricatures FOR ALL
  USING (public.is_superadmin(auth.email()))
  WITH CHECK (public.is_superadmin(auth.email()));

CREATE TRIGGER trg_sm_caricatures_updated
  BEFORE UPDATE ON public.sm_caricatures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public)
VALUES ('social-caricatures', 'social-caricatures', true);

CREATE POLICY "Superadmin manage caricature files"
  ON storage.objects FOR ALL
  USING (bucket_id = 'social-caricatures' AND public.is_superadmin(auth.email()))
  WITH CHECK (bucket_id = 'social-caricatures' AND public.is_superadmin(auth.email()));

CREATE POLICY "Public read caricature files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'social-caricatures');
```

### Files to create
- `src/pages/social/CaricatureLibrary.tsx`
- `src/services/social/caricatureService.ts`
- `src/components/social/CaricaturePicker.tsx` (used in Create Post)
- `src/components/social/AiImageGenerator.tsx` (the no-media generator panel)
- `supabase/functions/social-generate-image/index.ts`

### Files to edit
- `src/App.tsx` — add lazy import + route.
- `src/components/layout/Sidebar.tsx` — add menu entry.
- `src/pages/social/CreatePost.tsx` — render `<AiImageGenerator>` when `media.length === 0`; insert the returned image into `media` state pre-uploaded.
- `src/services/social/aiService.ts` — add `generateAiImage`.

### Image model
- Default: `google/gemini-2.5-flash-image` (Nano Banana) — fast, edit-image supported, included in Lovable AI Gateway.
- No new secrets needed (`LOVABLE_API_KEY` already configured).

---

## Out of scope
- Auto-generating videos.
- Bulk caricature import.
- Per-caricature usage analytics.
