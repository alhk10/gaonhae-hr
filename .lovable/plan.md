# Add "Download APK" button to SMS Bridge page

## What changes

1. **`.github/workflows/android.yml`** — after the APK is built and verified, publish it to a rolling GitHub Release so there's a stable public download URL.
   - Adds `permissions: contents: write` to the job.
   - New step uses `softprops/action-gh-release@v2` to create/update a release tagged `android-latest` with `app-debug.apk` attached.
   - Uses the built-in `GITHUB_TOKEN` — no extra secrets.
   - Resulting stable URL:
     `https://github.com/alhk10/gaonhae-hr/releases/download/android-latest/app-debug.apk`

2. **`src/config/constants.ts`** — add:
   ```ts
   export const ANDROID_APK_URL =
     'https://github.com/alhk10/gaonhae-hr/releases/download/android-latest/app-debug.apk';
   ```
   so the URL lives in one place.

3. **`src/pages/SmsBridge.tsx`** — add a "Download APK" button in the header row (right side of the title/description block).
   - shadcn `Button` + `Download` lucide icon, rendered as an `<a href={ANDROID_APK_URL} target="_blank" rel="noopener">` (or `asChild`).
   - Small helper text under the button: "Android 8+ · sideload on the phone that will send SMS."
   - Header becomes a flex row that stacks on mobile.

## Out of scope

- No changes to Android sources, signing config, or SMS Bridge business logic.
- No Supabase tables, edge functions, or migrations.
- Repo is public → the download link works for anyone. If you make the repo private later, GitHub will require auth to download.
