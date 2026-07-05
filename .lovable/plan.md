## Problem
Android shows "App not installed" / parse error when installing `app-debug.apk` transferred directly to the phone. This almost always means one of:

1. **File corruption during transfer** (most common) — the APK was truncated or altered (email, messaging apps, cloud previews often do this).
2. **minSdkVersion too high** for the phone's Android version.
3. **APK signature / v1 signing missing** — some newer Android versions reject unsigned or v2-only debug APKs on certain devices.
4. **ABI mismatch** — unlikely for a Capacitor/webview app, but possible if the workflow produced an arch-specific APK.

## Investigation steps (no code changes yet)

1. Read `android/app/build.gradle.kts` (or `build.gradle`) to confirm:
   - `minSdkVersion` / `targetSdkVersion`
   - `applicationId`
   - signing config for `debug`
   - whether it produces a universal APK or split by ABI
2. Read `.github/workflows/android.yml` to confirm which task builds the artifact (`assembleDebug` vs `bundleDebug`) and what file it uploads.
3. Confirm the artifact uploaded is `app-debug.apk` (not `.aab`, which cannot be sideloaded).

## Likely fixes (applied after investigation, in build mode)

- **A. Re-download properly.** Download the zip on the phone from GitHub Actions directly (Chrome on Android), unzip with a file manager, install. Skip WhatsApp/Telegram/Gmail — they can corrupt or rename the APK. This alone resolves ~80% of parse errors.
- **B. Lower `minSdkVersion`** if the phone's Android is below it (Capacitor defaults to 22 or 23; we can drop to 22).
- **C. Enable both v1 (JAR) and v2 signing** in the debug signing config so older/newer devices both accept it.
- **D. Force a single universal debug APK** (disable ABI splits) so the artifact runs on any device.
- **E. Enable "Install unknown apps"** for the app used to open the APK (Files, Chrome) in Android Settings — this is a device setting, not a code fix, but I'll call it out.

## Technical section

Expected changes if B–D are needed:

```kotlin
// android/app/build.gradle.kts
android {
    defaultConfig {
        minSdk = 22
    }
    signingConfigs {
        getByName("debug") {
            // ensure v1SigningEnabled = true, v2SigningEnabled = true
        }
    }
    splits { abi { isEnable = false } }
}
```

Workflow stays on `./gradlew assembleDebug` and uploads `app/build/outputs/apk/debug/app-debug.apk`.

## Deliverable
After investigating the two files, I'll either (a) tell you the transfer method is the cause and give exact download steps, or (b) push a small `android/app/build.gradle.kts` fix, let CI rebuild, and you retry with the new APK.

## What I need from you to speed this up
- Your phone's Android version (Settings → About phone).
- How you transferred the APK (WhatsApp, Google Drive, USB, etc.).
