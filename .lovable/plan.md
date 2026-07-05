## Goal
Make the debug APK more reliable to sideload on your Android 14 TCL Nxtpaper 14 T612B.

## What the error likely means
Because your phone is Android 14, `minSdk = 26` is not the problem. Since you already downloaded the zip through Google Drive and extracted the APK, the remaining likely causes are:

1. An existing app with the same package name but a different signature is already installed.
2. The APK installer dislikes the current debug signing metadata.
3. The copied APK is still being altered/truncated by Drive or the file manager.
4. Android 14 is rejecting something that will be visible from a stronger APK verification step.

## Plan
1. **Harden the Android debug APK config**
   - Add an explicit debug signing config.
   - Enable v1 and v2 signing explicitly.
   - Disable APK splits so the workflow always produces one universal APK.
   - Keep `minSdk = 26` because Android 14 supports it.

2. **Improve GitHub Actions artifact validation**
   - After `assembleDebug`, add a verification step that prints APK metadata using Android SDK tools.
   - This will confirm the artifact is truly an APK, signed, and installable-format before upload.

3. **Update install instructions**
   - Add a short Android 14 troubleshooting checklist:
     - Uninstall any old `SMS Bridge` app first.
     - Download the GitHub Actions zip directly on the phone if possible.
     - Extract `app-debug.apk`, not install the zip.
     - Try Android’s built-in Files app, not Drive preview.
     - Enable “Install unknown apps” for the installer app.

4. **You retry with the next APK artifact**
   - Push will trigger the APK workflow.
   - Download the new `SmsBridge-debug-apk` artifact, extract it, uninstall the old app if present, then install `app-debug.apk`.

## Technical changes
- `android/app/build.gradle.kts`
  - Add explicit `signingConfigs.debug` settings.
  - Link debug build type to that config.
  - Add `splits { abi { isEnable = false } }`.

- `.github/workflows/android.yml`
  - Add an APK verification step after build and before upload.

- `android/BUILD_APK.md` or `android/README.md`
  - Add Android 14 sideload troubleshooting notes.