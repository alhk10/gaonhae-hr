## Goal

Pivot the Social Media module from API-based auto-publishing to a **manual export workflow**. You generate content + AI captions inside the app, then download the media and copy the caption/hashtags to post manually on Instagram, Facebook, and TikTok. Remove the half-built Instagram OAuth/publishing infrastructure entirely.

## What changes for you (the user)

1. **Create Post** page becomes a multi-platform composer:
   - Pick target platforms (Instagram, Facebook, TikTok) via toggle chips.
   - AI generates a tailored caption variant per selected platform (different tone, length, hashtag count).
   - Each platform shows its own preview card with: platform-specific caption, hashtag block, character count, and a one-click "Copy caption" + "Copy hashtags" + "Copy all" button.
   - "Download media" button bundles uploaded images/videos as a ZIP (or single file if only one).
   - "Mark as Posted" button per platform → logs to history with timestamp + which platform.

2. **Scheduled Posts** becomes **Posting Queue**:
   - Acts as a reminder list ("post this on Fri 2 May at 18:00 to Instagram + TikTok").
   - On the scheduled time, the post surfaces in the Dashboard "Ready to post now" widget.
   - Each queued post has the same Download + Copy + Mark Posted actions.
   - No background publishing — purely a checklist.

3. **Dashboard** gains:
   - "Ready to post now" section (queue items past their scheduled time, not yet marked posted).
   - "Posted this week" counter per platform.
   - Removes any "Connected Instagram account" widgets.

4. **Brand Settings**:
   - Removes the "Connect Instagram" section entirely.
   - Keeps brand voice, audience, keywords, and adds per-platform tone overrides (optional): e.g. LinkedIn-style for Facebook longer captions, hook-first for TikTok.

5. **Analytics** becomes a manual log view: posts marked as posted, grouped by platform, with optional fields for you to type in real engagement numbers later (likes/comments/views).

## Cleanup (removed)

- Tables: `sm_ig_accounts`, `sm_oauth_states` (drop).
- Edge functions: `social-ig-oauth-start`, `social-ig-oauth-callback`, `social-ig-verify`, `social-publish-instagram`, `social-scheduler-tick` (delete if present).
- Storage `social-media` bucket: kept (still needed for media uploads).
- Secrets `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`: not added (request cancelled).
- `igAccountService.ts`: deleted.
- All "Connect Instagram" UI in Brand Settings.

## Database changes

- Drop `sm_ig_accounts`, `sm_oauth_states`.
- Modify `sm_posts`:
   - Add `target_platforms text[]` (e.g. `{instagram,facebook,tiktok}`).
   - Add `platform_captions jsonb` (per-platform caption/hashtags/cta).
   - Add `posted_platforms jsonb` (e.g. `{"instagram":"2026-05-02T18:00Z","tiktok":null}`).
   - Add `scheduled_for timestamptz` (reminder time, nullable).
   - Replace `status` values with: `draft`, `queued`, `posted`, `archived`.
- New table `sm_post_metrics` (optional manual stats): `post_id`, `platform`, `likes`, `comments`, `views`, `recorded_at`.
- RLS: superadmin-only, same pattern as existing `sm_*` tables.

## AI caption engine update

`social-generate-caption` edge function:
- Accept `platforms: string[]` in request body.
- Return `{ instagram: {...}, facebook: {...}, tiktok: {...} }` keyed object instead of single caption.
- Per-platform rules baked into prompt: IG ≤2200 chars + 15-25 hashtags; FB longer-form + 3-5 hashtags + link-friendly; TikTok ≤150 char hook + 4-6 trending-style hashtags + no link.
- Refinement buttons (shorter / professional / exciting) operate on the currently selected platform tab.

## Frontend file changes

- **Edited**: `src/pages/social/CreatePost.tsx` (platform toggles, multi-tab caption workspace, copy/download/mark-posted actions), `src/pages/social/ScheduledPosts.tsx` (rename UI to "Posting Queue", reminder logic), `src/pages/social/SocialDashboard.tsx` ("Ready to post now" + posted counters), `src/pages/social/BrandSettings.tsx` (drop IG connect, add per-platform tone), `src/pages/social/Analytics.tsx` (manual stats log), `src/services/social/postService.ts` (platforms, posted_platforms helpers), `src/services/social/aiService.ts` (multi-platform request shape).
- **Created**: `src/lib/social/exportHelpers.ts` (ZIP bundling via `jszip`, copy-to-clipboard, character counters), `src/components/social/PlatformBadge.tsx`, `src/components/social/CopyButton.tsx`.
- **Deleted**: `src/services/social/igAccountService.ts`.
- **Edited**: `src/components/layout/Sidebar.tsx` (rename "Scheduled Posts" → "Posting Queue").
- **Dependency**: add `jszip` for media bundling.

## Out of scope

- No auto-posting, no Meta/TikTok API integration, no OAuth.
- No automatic engagement scraping — analytics numbers entered manually.
- No image/video editing — files exported as uploaded.

Approve to proceed.