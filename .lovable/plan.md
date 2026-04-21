

## Plan: CCTV Monitoring page

A new authenticated page that displays a grid of branch cards, each playing a live HLS video stream proxied from a self-hosted MediaMTX server. RTSP camera URLs are stored in the database and never leave the server — the frontend only sees relay URLs like `https://media.gaonhae.app/<token>/index.m3u8`.

### Important: required infrastructure (out of Lovable's reach)

Live RTSP-to-HLS conversion requires a server you control running MediaMTX (or equivalent). **Lovable cannot host this.** You'll need:

1. A small VPS (1 vCPU, 1 GB RAM is enough for ~10 cameras) reachable from each branch's router.
2. MediaMTX installed (single binary, free, open-source) listening on:
   - `:8554` for RTSP ingest (cameras push, or it pulls)
   - `:8888` for HLS playback
   - `:8889` for WebRTC playback (optional, low-latency)
3. Each branch camera/NVR configured to either be reachable by MediaMTX (pull mode) or to push to MediaMTX (push mode — more reliable behind NAT).
4. A TLS hostname pointed at MediaMTX (e.g. `media.gaonhae.app`) so browsers can play it from HTTPS pages.

The plan below builds everything around that — once the server exists, paths are configured per-branch via the new admin UI and streams Just Work.

### New tables (Supabase)

- `cctv_cameras`
  - `id uuid pk`, `branch_id text fk → branches.id`, `name text`, `mediamtx_path text` (e.g. `balmoral-front`), `supports_playback bool default false`, `is_active bool default true`, `display_order int default 0`, `created_at`, `updated_at`.
  - **No raw RTSP URL stored client-side.** Raw RTSP credentials live in MediaMTX's own config on the VPS (or in a private `cctv_camera_secrets` table only readable by service role).
- `cctv_camera_secrets` (optional, server-only)
  - `id uuid pk`, `camera_id uuid fk`, `rtsp_url text`, `username text`, `password text`. RLS: deny all to authenticated; only service_role can read. Used by the edge function below to render MediaMTX config or to mint signed playback tokens.
- RLS on `cctv_cameras`:
  - SELECT: superadmin OR `has_branch_access(branch_id)` (existing function).
  - INSERT/UPDATE/DELETE: superadmin only.

### Edge function: `cctv-stream-token`

- Input: `{ camera_id }`.
- Verifies caller is authenticated and has branch access to that camera's `branch_id` (reuses `has_branch_access`).
- Returns a short-lived signed URL: `https://media.gaonhae.app/<mediamtx_path>/index.m3u8?jwt=…` (HMAC-signed, 5-minute TTL). MediaMTX is configured with the matching shared secret in its `authJWTJWKS`/`authInternalUsers` block to validate the JWT before serving the segment.
- Same pattern for WebRTC: returns `https://media.gaonhae.app/<mediamtx_path>/whep?jwt=…`.

This is what hides the raw RTSP URL — the browser only ever sees a per-session signed HLS URL.

### Permissions

- New permission key `cctv_monitoring` added to `employee_page_access` (boolean, default false).
- Auto-granted to superadmin. Toggleable per employee in the existing **Settings → Employee Access** UI (one-line addition).
- Route gated with `<PageAccessGuard requiredPermission="cctv_monitoring">`.

### Frontend

- Route: `/cctv` → `src/pages/CctvMonitoring.tsx`.
- Sidebar entry "CCTV Monitoring" (icon `Video` from lucide-react), shown when permission is granted.
- Page layout:
  - Header with branch filter (uses `useBranchAccess` so non-superadmins only see their branches).
  - Responsive grid: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` of `<CameraCard>`.
  - Each card:
    - Branch name + camera name.
    - Camera selector dropdown if branch has >1 camera.
    - HLS player using `hls.js` (already-supported pattern: native `<video>` on Safari/iOS, `hls.js` elsewhere).
    - Auto-reconnect: on `ERROR_FATAL` event re-fetch a fresh signed URL via `cctv-stream-token` and call `hls.loadSource()` again, exponential backoff (1s, 2s, 5s, max 30s).
    - "Live" indicator dot + last-frame-received timestamp.
    - Optional "Playback" button (only when `supports_playback=true`) — opens a date/time picker that requests a VOD URL from the same edge function (MediaMTX `playback` endpoint).
- Mobile: cards stack 1 column, video uses `aspect-video`, controls remain reachable.

### Admin UI

- New tab in **Settings → Branches → Branch Setup dialog** called **"CCTV Cameras"** (re-uses the existing per-branch setup hub built last task).
  - Lists this branch's cameras with edit/delete.
  - "Add camera" form: Name, MediaMTX path, Supports playback toggle, Active toggle, Display order.
  - For superadmin only: separate collapsible "Stream credentials (server-only)" panel that writes to `cctv_camera_secrets`.

### What stays the same

- No changes to existing auth, sidebar render, branch access service, or other settings tabs.
- No new third-party SaaS — `hls.js` is a small open-source npm dep, MediaMTX is self-hosted.

### Files

- New: `src/pages/CctvMonitoring.tsx`
- New: `src/components/cctv/CameraCard.tsx`
- New: `src/components/cctv/HlsPlayer.tsx`
- New: `src/components/cctv/PlaybackDialog.tsx`
- New: `src/components/settings/branch-setup/CctvCamerasTab.tsx`
- New: `src/services/cctvService.ts`
- New: `supabase/functions/cctv-stream-token/index.ts`
- Modify: `src/App.tsx` (add `/cctv` route)
- Modify: `src/components/layout/Sidebar.tsx` (add menu item)
- Modify: `src/components/settings/BranchSetupDialog.tsx` (add tab)
- Modify: `src/types/employee.ts` (add `cctvMonitoring` to `EmployeePageAccessPermissions`)
- Migration: create the two tables + RLS, add `cctv_monitoring` boolean column to `employee_page_access`.

### What you (the user) need to provide before this works

1. A VPS with MediaMTX installed and a TLS hostname (we'll add a setup README to the repo).
2. A shared HMAC secret saved in Supabase secrets as `MEDIAMTX_JWT_SECRET` and in MediaMTX's config.
3. The MediaMTX base URL saved as `MEDIAMTX_BASE_URL` (e.g. `https://media.gaonhae.app`).
4. Per-camera RTSP URL + credentials, entered once via the new Branch Setup → CCTV Cameras tab.

### Verification (after VPS is up)

- Add a test camera at Morley with `mediamtx_path = morley-test`, RTSP `rtsp://user:pass@10.0.0.20/stream1`.
- Visit `/cctv` as superadmin → grid shows Morley card with live video within 2-3 seconds.
- Disconnect camera Ethernet → "Reconnecting…" overlay appears, retries automatically.
- Log in as a Morley-only employee with `cctv_monitoring=true` → sees only Morley cameras; cannot see Balmoral.
- Network tab: HLS URL contains `?jwt=…`; raw RTSP URL never appears in any client request.

### Out of scope

- VPS provisioning, MediaMTX install scripts, NAT/router setup at branches.
- Recording-to-cloud, motion alerts, AI analytics — purely live + on-camera playback.
- Multi-tenant access beyond existing branch-access model.

