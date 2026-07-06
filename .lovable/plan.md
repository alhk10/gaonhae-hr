## Problem

GitHub Actions build fails at "Set up Android SDK" step:
```
Warning: An error occurred while preparing SDK package Android Emulator: Error on ZipFile unknown archive.
Error: The process '/usr/local/lib/android/sdk/cmdline-tools/16.0/bin/sdkmanager' failed with exit code 1
```

`android-actions/setup-android@v3` auto-installs the Android **Emulator** package by default, and its download is currently corrupted/failing on the runner. The APK build doesn't need the emulator at all.

## Fix

Update `.github/workflows/android.yml` — the "Set up Android SDK" step — to explicitly list only the packages we need (skip emulator):

```yaml
- name: Set up Android SDK
  uses: android-actions/setup-android@v3
  with:
    packages: 'platform-tools platforms;android-34 build-tools;34.0.0'
```

This bypasses the failing emulator download. Gradle will still find everything it needs to assemble the debug APK.

No other files change. After push, re-run the workflow; the APK artifact and rolling release will publish as before.