

## Plan: Instagram AI Content & Posting Module

A new module that lets superadmins/marketing staff generate AI-written Instagram captions tailored to brand voice + branch, schedule posts, route them through approval, and (optionally) publish to Instagram Business accounts via the Meta Graph API.

### Important: third-party requirements (out of Lovable's control)

Publishing to Instagram requires Meta-side setup that you must do once:
1. A **Facebook Page** linked to each Instagram **Business/Creator** account (one per branch you want to publish to).
2. A **Meta Developer App** with the `instagram_content_publish`, `instagram_basic`, `pages_show_list`, `pages_read_engagement` permissions, reviewed and approved by Meta.
3. A **long-lived Page Access Token** per branch (stored as a Supabase secret, never exposed to the browser).

Until those are configured, the module still works end-to-end as a **draft + approval + scheduled queue** — only the final "Publish to Instagram" step is gated on the token being present. Drafts/approvals/AI generation work immediately.

### Database (new tables)

- `brand_settings`
  - `id uuid pk`, `branch_id text fk → branches.id` (nullable = global default), `tone text`, `keywords text[]`, `default_hashtags text[]`, `caption_style text`, `language text default 'en'`, `created_at`, `updated_at`.
  - One row per branch + one global fallback. RLS: SELECT for any authenticated user with branch access; INSERT/UPDATE/DELETE for superadmin only.

- `social_posts`
  - `id uuid pk`, `branch_id text fk → branches.id`, `content_type text check in ('achievement','training','educational','promotion')`, `caption text`, `cta text`, `hashtags text[]`, `media_url text`, `media_type text check in ('image','video')`, `scheduled_at timestamptz`, `status text check in ('draft','pending_approval','approved','scheduled','publishing','published','failed') default 'draft'`, `instagram_media_id text`, `instagram_permalink text`, `failure_reason text`, `created_by text` (employee email), `approved_by text`, `approved_at timestamptz`, `published_at timestamptz`, `created_at`, `updated_at`.
  - RLS: SELECT for branch access OR superadmin; INSERT for branch access; UPDATE limited to creator (while `draft`) or superadmin (any state); DELETE superadmin only.

- New storage bucket: `social-media` (public read, authenticated write) — uploaded photos/videos for posts.

### Permissions

- New `employee_page_access.social_media boolean default false`. Superadmin always allowed. Sidebar item shows when granted. Route guard via existing `<PageAccessGuard requiredPermission="socialMedia">`. Update `EmployeePageAccessPermissions` type and the `get_page_access_for_auth` RPC.

### Edge functions

1. **`social-generate-caption`** (auth required)
   - Input: `{ branch_id, content_type, custom_notes? }`.
   - Loads `brand_settings` for that branch (falling back to global), composes the prompt as specified (tone/keywords/branch/content_type), and calls **Lovable AI Gateway** with `google/gemini-3-flash-preview` using **tool calling** to enforce structured JSON output `{ caption, cta, hashtags: string[10] }`. Handles 429/402 with friendly errors.
   - No Meta involvement — pure text generation.

2. **`social-publish-instagram`** (auth required, superadmin or post-creator only)
   - Input: `{ post_id }`. Loads the `social_posts` row + secrets `IG_PAGE_TOKEN_<BRANCH_ID>` and `IG_ACCOUNT_ID_<BRANCH_ID>`.
   - Two-step Graph API flow: (a) `POST /<ig-user-id>/media` with `image_url` (or `video_url` + `media_type=VIDEO`) + caption; (b) `POST /<ig-user-id>/media_publish` with the returned container id. Stores `instagram_media_id` + `permalink`, flips status to `published`, sets `published_at`.
   - On error, sets status to `failed` and stores `failure_reason`.

3. **`social-scheduler-tick`** (cron, every 5 min via `pg_cron` + `pg_net`)
   - Finds posts where `status='scheduled' AND scheduled_at <= now()`, invokes `social-publish-instagram` for each.

### Frontend

- New route `/social` → tabbed page `SocialMedia.tsx` with three tabs:
  - **Create** — `/social` default tab. Branch selector → media upload (storage bucket `social-media`) → content type dropdown → "Generate Caption" button → editable caption / CTA / hashtags fields → mobile Instagram-style preview card (square crop + caption truncation rules) → Save Draft / Submit for Approval.
  - **Calendar** — month grid (reuses `Calendar`/`react-day-picker`); each day shows pill chips per post coloured by status; branch filter bar; click a chip to open the editor dialog.
  - **Approvals** — superadmin-only list of `pending_approval` posts with Approve / Reject (with note) actions; approving with `scheduled_at` set → status `scheduled`, otherwise → status `approved` (manual publish).

- New components:
  - `src/components/social/PostEditorDialog.tsx` — shared edit dialog used from Create tab and Calendar.
  - `src/components/social/InstagramPreview.tsx` — mobile-format preview.
  - `src/components/social/PostStatusBadge.tsx`.
  - `src/components/social/MediaUpload.tsx` — uses existing storage upload pattern.

- New service: `src/services/socialMediaService.ts` (CRUD on `social_posts` + `brand_settings`, upload helpers, edge-function invokers).

### Brand settings UI

- New tab inside the existing **Branch Setup dialog** (`BranchSetupDialog.tsx`) called **"Brand Voice"** — edits `brand_settings` for that branch (tone, keywords, default hashtags, caption style). Plus a global default editable from **Settings → System** as a top-level card.

### Sidebar

- Add `{ icon: Instagram, label: 'Social Media', path: '/social' }` (lucide `Instagram`) for superadmin and for any employee with `pageAccess.socialMedia`.

### Cron job

- One-time SQL to register the 5-minute `social-scheduler-tick` job using `pg_cron` + `pg_net` (you'll need to confirm `pg_cron`/`pg_net` are enabled — they're already used by other reminder functions in this project, so this should just work).

### Verification

- Settings → Branches → Brand Voice for Morley → set tone "energetic, family-friendly", keywords ["taekwondo","kids","Perth"]. Save.
- `/social` → upload a training photo → branch Morley → content type Training → click Generate Caption → caption + CTA + 10 hashtags appear. Edit if desired. Submit for Approval.
- Log in as superadmin → Approvals tab shows the post → Approve with `scheduled_at = now() + 2 minutes`.
- Within 5 min, scheduler tick runs, post moves to `publishing` → `published` (if Meta token is configured) or `failed` with reason (if not). Permalink stored.
- Calendar tab → post chip appears on the scheduled day with correct status colour.
- Network tab: no Meta token ever leaves the edge function; raw IG account IDs not exposed to the browser.

### Out of scope

- Per-user Instagram OAuth (we use one Page token per branch; Meta does not support per-end-user posting to a brand IG account anyway).
- Carousel posts, Reels with cover-frame selection, Stories — only single-image and single-video feed posts in v1.
- Auto-suggesting best post times, analytics on engagement (likes/comments) — read-back from IG insights is a follow-up.
- Multi-language generation beyond what the AI naturally produces from the brand `language` field.

