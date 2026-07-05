## Goal
Replace the "copy this token" step with a scannable QR code so pairing the Android app is a one-tap scan instead of a manual paste.

## Webapp changes (`src/pages/SmsBridge.tsx`)
- Add `qrcode.react` dependency.
- In the "Register Android device" dialog, when a token is issued:
  - Encode a JSON payload as a QR code:
    ```json
    {
      "v": 1,
      "url": "https://qwdcbfnuywgubumlgscy.supabase.co",
      "anon": "<VITE_SUPABASE_PUBLISHABLE_KEY>",
      "token": "<issued token>",
      "delay": 3000
    }
    ```
  - Render a large (240px) `<QRCodeSVG>` centered in the dialog.
  - Keep the raw token text + Copy button below as a fallback for manual entry.
  - Add short helper text: "Open SMS Bridge → Scan QR on your Android phone."

## Android changes
- Add ZXing scanner dependency (`com.journeyapps:zxing-android-embedded`) in `android/app/build.gradle.kts`.
- Add `CAMERA` permission to `AndroidManifest.xml`.
- In `MainActivity.kt`: add a **Scan QR** button next to the manual token field. Launches `IntentIntegrator` (portrait, no beep). On result:
  - Parse JSON, populate Supabase URL, anon key, device token, and send delay fields.
  - Save via existing `Config` store, show a toast "Device paired".
- Keep manual paste path intact as fallback.

## Files touched
- `src/pages/SmsBridge.tsx` (dialog UI)
- `package.json` (`qrcode.react`)
- `android/app/build.gradle.kts` (ZXing dep)
- `android/app/src/main/AndroidManifest.xml` (camera permission)
- `android/app/src/main/java/app/lovable/smsbridge/MainActivity.kt` (scan button + parser)
- `android/README.md` (mention QR pairing)

No database, edge function, or auth changes.
