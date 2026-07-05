# SMS Bridge — Android companion app

A minimal Kotlin/Android app that pairs with the Lovable SMS Bridge:
- Polls Supabase for queued outbound SMS and sends them via the phone's SIM.
- Enforces a **3-second delay between messages** (configurable per device from the webapp).
- Forwards every incoming SMS to Supabase, threaded by phone.

## Requirements
- Android Studio (Hedgehog or newer)
- An Android phone (physical, SIM inserted, SMS plan)
- Kotlin 1.9+, minSdk 26, targetSdk 34

## Setup

1. Open the `android/` folder in Android Studio (open as project).
2. Connect your phone via USB (developer mode + USB debugging on).
3. Run the app on the device.
4. In the webapp: **SMS Bridge → Devices → Register device**. A QR code appears.
5. In the Android app, tap **Scan QR to pair** and point the camera at the QR. URL, anon key, token, and delay auto-fill.
6. (Fallback) You can still paste the token manually if scanning isn't possible.
   - Device token: paste
   - Send delay (ms): default 3000
6. Grant SMS + notification permissions when prompted.
7. Tap **Start**.

The persistent notification means the service keeps running. Battery-optimize the app: Settings → Battery → don't optimize for `SmsBridge`.

## What it does

- **SmsSyncService** (foreground service) loops every `poll_interval_seconds`:
  1. `GET /functions/v1/sms-fetch-pending` → returns messages + configured `send_delay_ms`
  2. for each message: `SmsManager.sendTextMessage()`, await the sent-broadcast, POST `/functions/v1/sms-report-status`, `delay(send_delay_ms)`
- **SmsInboundReceiver** listens to `android.provider.Telephony.SMS_RECEIVED`. On each SMS it POSTs to `/functions/v1/sms-inbound`.

## Distribution

This app uses restricted SMS permissions. Google Play blocks non-default SMS handlers with these permissions, so **sideload only** (`Build → Generate Signed APK` and install on your phone). Do not publish to Play.

## Android 14 sideload checklist

If Android says **"App not installed"** or shows a parse error:

1. Uninstall any existing **SMS Bridge** app first.
2. Download the GitHub Actions artifact zip locally, then extract it.
3. Install the extracted `app-debug.apk`, not the zip.
4. Open the APK from Android's built-in **Files** app instead of Drive preview.
5. Enable **Install unknown apps** for the app opening the APK.

## Files

```
android/
  settings.gradle.kts
  build.gradle.kts
  gradle.properties
  app/
    build.gradle.kts
    src/main/
      AndroidManifest.xml
      java/app/lovable/smsbridge/
        MainActivity.kt
        Config.kt
        ApiClient.kt
        SmsSyncService.kt
        SmsInboundReceiver.kt
        SmsSentReceiver.kt
```
