## Diagnosis
Edge function `sms-inbound` has received **zero** requests — the Android app is not forwarding inbound SMS to Supabase. Sending works, so pairing/network/tokens are fine. The failure is on the phone.

Most likely: `RECEIVE_SMS`/`READ_SMS` runtime permission was never granted (they must be requested separately from `SEND_SMS` on Android 6+), or errors in `postInbound` are being silently swallowed by the receiver.

## Fix — Force perms + local log

### Android app changes

**`MainActivity.kt`**
- On every `onCreate`, immediately call `requestPerms()` (currently only fires after Save & Start). Adds `RECEIVE_SMS`, `READ_SMS`, `SEND_SMS`, `POST_NOTIFICATIONS` prompts on launch.
- Add an "Open app settings" button so users can grant a permission that was previously "Don't ask again".
- Add a "View inbound log" button that reads the last ~50 lines of `inbound.log` from app-internal storage and shows them in a scrollable dialog.
- Add a status line showing granted/denied state of `RECEIVE_SMS`, `READ_SMS`, `SEND_SMS` after launch.

**`SmsInboundReceiver.kt`**
- Replace the swallowed `catch (_: Exception) {}` with a call to a new `InboundLog.append(ctx, line)` helper that writes timestamped entries to `filesDir/inbound.log` (rotated at ~64KB).
- Log every step: "SMS_RECEIVED from <addr>", "posting to sms-inbound…", "OK 200" or "ERROR <code/message>". Also log when the receiver early-returns because `Config.enabled(ctx)` is false.
- Still call `postInbound` in `Dispatchers.IO`; log the response body when non-2xx.

**`ApiClient.kt`**
- Make `postInbound` return the HTTP status code and error body (throw on non-2xx) so the receiver can log it.

**New `InboundLog.kt`**
- Simple appender: `append(ctx, line)`, `read(ctx): String`, `clear(ctx)`. Writes to `filesDir/inbound.log`.

### No changes to
- Web app UI, edge functions, database schema, or `smsService.ts`. The server side is confirmed healthy (empty logs = no requests reached it).

### After rebuild
User sideloads the new APK, launches the app once (grants all SMS permissions when prompted), sends a test SMS to the phone, then taps "View inbound log" to see exactly what happened. Once the log shows a real HTTP error we can fix the specific cause; if it shows nothing, the OS never delivered the broadcast (permission or default-SMS-app issue).

## Files touched
- `android/app/src/main/java/app/lovable/smsbridge/MainActivity.kt`
- `android/app/src/main/java/app/lovable/smsbridge/SmsInboundReceiver.kt`
- `android/app/src/main/java/app/lovable/smsbridge/ApiClient.kt`
- `android/app/src/main/java/app/lovable/smsbridge/InboundLog.kt` (new)

## Out of scope
- WorkManager retry queue.
- Default-SMS-app switch (not required for `SMS_RECEIVED_ACTION`, only for `SMS_DELIVER`).
- Server-side changes.