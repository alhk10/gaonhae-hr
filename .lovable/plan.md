## Phase 2: Instagram Integration & Publishing

Wire up Instagram Graph API publishing using your Meta App credentials, plus the verification and OAuth callback flows.

### 1. Secrets (request via add_secret)

- `META_APP_ID` — your Meta App ID
- `META_APP_SECRET` — your Meta App Secret
- `META_REDIRECT_URI` — the OAuth callback URL (will be the `social-ig-oauth-callback` function URL)

### 2. Edge Functions (3 new)

**`social-ig-oauth-start`**
- Superadmin-only (verify JWT + role)
- Input: `{ branch_name }`
- Generates a signed `state` token (binds branch + user + expiry) stored in `sm_oauth_states` table
- Returns Facebook OAuth dialog URL with scopes: `instagram_basic, instagram_content_publish, pages_show_list, pages_read_engagement, business_management`

**`social-ig-oauth-callback`**
- Public (Meta redirects here)
- Validates `state`, exchanges `code` → short-lived token → long-lived token (60 days)
- Fetches linked Pages → Instagram Business Account ID + username
- Upserts into `sm_ig_accounts` (token encrypted at rest via `pgsodium` or stored in a service-role-only column)
- Returns an HTML page that closes the popup and posts a message to the opener

**`social-ig-verify`**
- Superadmin-only
- Calls `GET /{ig_user_id}?fields=username,followers_count` with stored token
- Updates `last_verified_at`, `status`, refreshes `ig_username`
- Returns `{ ok, message, username, followers_count }`

### 3. Database additions

- `sm_oauth_states` table: `state` (PK), `branch_name`, `created_by`, `expires_at` — for CSRF protection
- Add `access_token_encrypted` column to `sm_ig_accounts` (text, service-role only via RLS)
- Tighten RLS: token columns never readable by client

### 4. Frontend wiring

**`BrandSettings.tsx`** — already has the IG account section; add:
- "Connect Instagram" button → calls `social-ig-oauth-start`, opens popup, listens for `postMessage`
- "Verify" button per linked account → calls `verifyIgAccount`
- "Disconnect" button → confirms then `disconnectIgAccount`
- Token expiry warning badge if `<7 days` to expiry

**`igAccountService.ts`** — add `startOAuth(branch)` that invokes the start function and opens the popup.

### 5. Validation & QA

- Test OAuth round-trip with your Meta App in dev mode
- Verify token storage is service-role-only (RLS test)
- Verify the function returns a usable IG Business Account (not personal)
- Confirm the popup → opener postMessage flow refreshes the BrandSettings list

### Files to create/edit

- **New**: `supabase/functions/social-ig-oauth-start/index.ts`, `supabase/functions/social-ig-oauth-callback/index.ts`, `supabase/functions/social-ig-verify/index.ts`
- **New migration**: `sm_oauth_states` table + token column + RLS
- **Edit**: `src/pages/social/BrandSettings.tsx`, `src/services/social/igAccountService.ts`
- **Edit**: `supabase/config.toml` — set `verify_jwt = false` for `social-ig-oauth-callback` only

### Out of scope (Phase 3)

- `social-publish-instagram` actual posting (file already exists as stub — wire after OAuth confirmed working)
- `social-scheduler-tick` cron processing
- Analytics fetching

---

**Approve to proceed.** I'll request the 3 Meta secrets first, then build the migration + functions + BrandSettings UI.
