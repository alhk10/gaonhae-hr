# AI Social Media Manager — Phase 1 (Foundation)

This is a large module. We'll deliver in two phases so each one is production-quality, not a shell. Phase 1 establishes the navigation, data model, brand foundation, AI caption generator, and Instagram account connection. Phase 2 layers publishing, scheduling, calendar, analytics, and AI suggestions on top.

Access in Phase 1: **superadmin only** (the existing `validateSuperadminAccess` check). A finer-grained `social_media` permission can be added later without rework.

---

## Phase 1 — what gets built now

### 1. Cascading sidebar (no redesign)

Extend `src/components/layout/Sidebar.tsx` with a new pattern: a `MenuGroup` (parent with children) alongside the existing flat `MenuItem`s. The current sidebar stays untouched for every other module.

Behaviour:
- Parent "Social Media" with `Share2` lucide icon
- Click toggles expansion; chevron rotates 90°; submenu slides down (Tailwind `transition-all` + `max-h`)
- Auto-expands when current route starts with `/social/`
- Expanded state persisted in `localStorage` (`sidebar.socialMedia.open`)
- Active child highlighted with the existing `bg-blue-600 text-white` pattern
- Mobile: behaves identically inside the existing overlay drawer
- Children:
  - Dashboard → `/social/dashboard`
  - Create Post → `/social/create`
  - Scheduled Posts → `/social/scheduled`
  - Content Calendar → `/social/calendar`
  - Brand Settings → `/social/brand`
  - Analytics → `/social/analytics`
  - AI Suggestions → `/social/suggestions`

### 2. Routes (lazy loaded, superadmin-gated)

Add 7 lazy routes in `src/App.tsx` wrapped in a new `SocialRoute` guard that requires superadmin. All pages share a `SocialLayout` with a sticky page header + breadcrumbs.

### 3. Database schema (Supabase)

New tables, all RLS-protected, superadmin-only in Phase 1 via `is_superadmin(auth.email())`:

- `social_brand_settings` — one row per branch (Perth, Singapore). Fields: branch_name, tone_of_voice, brand_keywords[], banned_words[], emoji_style, default_hashtags[], cta_style, target_audience, preferred_caption_length, color_palette (jsonb), logo_url, posting_frequency.
- `social_ig_accounts` — connected Instagram Business accounts. Fields: branch_name, ig_user_id, ig_username, page_id, page_name, access_token (encrypted via pgsodium or stored only in edge-function secrets), token_expires_at, status, last_verified_at.
- `social_media_assets` — uploaded media metadata. Fields: branch_name, storage_path, mime_type, width/height/duration, content_kind (image/reel/carousel), uploaded_by.
- `social_posts` — drafts + scheduled + published. Fields: branch_name, ig_account_id, content_type (Achievement/Grading/...), status (draft/pending/approved/scheduled/published/failed), caption, hashtags[], cta, overlay_text, reel_title, scheduled_for (timestamptz), timezone, published_at, ig_media_id, failure_reason, created_by, approved_by.
- `social_post_assets` — join table (post_id, asset_id, position).
- `social_ai_generations` — audit trail of every AI prompt/response for cost tracking and "regenerate" history. Fields: post_id, prompt, response (jsonb), model, tokens_used.
- `social_publish_logs` — one row per publish attempt with timestamp, success, ig response payload, error message.

Storage bucket `social-media` (private) with RLS — superadmins read/write any path, signed URLs used in UI.

### 4. Brand Settings page (`/social/brand`)

- Tabs for Perth and Singapore
- Form for every field above (chip inputs for arrays, color picker for palette, logo uploader to `social-media/brand/`)
- "Test AI tone" panel: enter a sample event description → calls AI → renders an example caption inline using current settings, without saving anything
- Reusable prompt presets section (saved into a new `social_prompt_presets` table)

### 5. Create Post page (`/social/create`)

- Branch selector (locks to the branches the user can access)
- Content-type selector (10 types listed in the brief)
- Media uploader (drag-and-drop, mobile camera, multi-file for carousel) → uploads to `social-media/posts/{post_id}/`
- Detail fields: event name, student name, instructor name, notes for AI, optional tags
- "Generate Caption" button → calls edge function (see #6)
- Editable caption + hashtag chips + emoji toggle + reel title + overlay text
- Quick-action regenerators: shorter / more professional / more exciting / family-friendly (each is a prompt variant)
- Instagram-style live preview (mobile + desktop toggle)
- Save as Draft (always available). "Schedule" / "Publish now" buttons stubbed in Phase 1 — they save with status `draft` and show a toast: "Scheduling & publishing arrive in Phase 2."

### 6. AI caption generator (Lovable AI Gateway)

New edge function `supabase/functions/social-generate-caption/index.ts`:
- Auth: validates JWT, checks `is_superadmin`
- Input: branch, content_type, event/student/instructor, notes, regen_mode?
- Loads `social_brand_settings` for the branch and builds a system prompt that enforces brand voice + bans words + family-friendly + martial-arts professionalism
- Calls `https://ai.gateway.lovable.dev/v1/chat/completions` with `google/gemini-3-flash-preview` and a tool-call schema returning structured JSON `{ caption, cta, hashtags[], overlay_text, reel_title }`
- Handles 402/429 → returns the same status to client; client shows toast
- Logs every call to `social_ai_generations`

### 7. Instagram OAuth connect (no publishing yet)

- New edge function `social-ig-oauth-callback` that exchanges short-lived code → long-lived token, fetches the linked Page + IG Business account, and stores in `social_ig_accounts`
- Brand Settings page shows a "Connect Instagram" button per branch that opens the FB OAuth dialog with required scopes: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`
- Required secrets to be added before this step: `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`
- Token refresh edge function scheduled monthly (pg_cron + pg_net) — code written but cron schedule deferred to Phase 2 alongside publishing
- A "Verify connection" button calls `me/accounts` to confirm the token still works

### 8. Placeholder pages for the other 5 routes

So nav works end-to-end:
- Dashboard, Scheduled Posts, Content Calendar, Analytics, AI Suggestions render a clean "Coming in Phase 2" panel with a short feature list and a CTA back to Create Post / Brand Settings. They are *real* pages with the shared layout, not blank screens.

---

## Phase 2 — deferred (next prompt)

For transparency, here's what we'll build after Phase 1 ships:

- Scheduling worker (pg_cron + edge function `social-publish-scheduled` that runs every minute, picks `scheduled` posts whose `scheduled_for <= now()`, publishes via IG Graph API with retry/backoff, writes to `social_publish_logs`)
- Approval workflow + notifications (reuse existing notifications module)
- Content Calendar with drag-and-drop rescheduling (react-day-picker + dnd-kit)
- Analytics page (reach/engagement pulled from IG Insights API, cached daily)
- AI Suggestions engine (reads grading events, attendance milestones, holidays, recent activity → proposes drafts)
- Provider abstraction layer in `src/services/social/providers/` so TikTok/Facebook/YouTube can be added without touching core
- Role expansion: add `social_media` flag to `admin_access` and split capabilities (Marketing draft → Admin approve → Admin publish)

---

## Technical notes

- **Stack reuse**: React + Tailwind + shadcn/ui + react-router + TanStack Query + Supabase — all already in the project. No new top-level deps.
- **New deps**: `dnd-kit` (Phase 2 only). Phase 1 needs none beyond what's installed.
- **Date display**: DD/MM/YYYY via `@/utils/dateFormat` per project memory.
- **Design tokens**: all colors via existing semantic tokens in `index.css` / `tailwind.config.ts` — no hardcoded hex.
- **Files added in Phase 1** (high-level):
  - `src/components/layout/Sidebar.tsx` (extend with cascading group)
  - `src/components/layout/SocialLayout.tsx`
  - `src/pages/social/SocialDashboard.tsx`, `BrandSettings.tsx`, `CreatePost.tsx`, `ScheduledPosts.tsx`, `ContentCalendar.tsx`, `Analytics.tsx`, `Suggestions.tsx`
  - `src/components/social/CaptionEditor.tsx`, `MediaUploader.tsx`, `InstagramPreview.tsx`, `BrandTonePlayground.tsx`, `ConnectInstagramButton.tsx`
  - `src/services/social/brandService.ts`, `postService.ts`, `aiService.ts`, `igAccountService.ts`
  - `src/hooks/useSocialBrand.ts`, `useSocialPosts.ts`
  - `supabase/functions/social-generate-caption/`, `social-ig-oauth-callback/`, `social-ig-verify/`
- **Secrets needed before Phase 1 build starts**: `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`. (`LOVABLE_API_KEY` is already provisioned.)
- **Migrations** are split: one for tables + RLS, one for storage bucket + policies. Both run before code edits.

---

## Acceptance for Phase 1

1. Sidebar shows new "Social Media" parent that expands/collapses with smooth animation; existing modules unchanged.
2. All 7 `/social/*` routes load (5 of them as polished "Phase 2" placeholders).
3. Brand Settings can save Perth and Singapore configs and run a live AI tone test.
4. Create Post can upload media, generate a structured AI caption respecting brand rules, edit it, and save as draft.
5. Instagram Business account can be connected per branch and verified (publishing intentionally not wired).
6. All data persisted in Supabase with RLS; nothing accessible to non-superadmins.

Approve to start Phase 1.