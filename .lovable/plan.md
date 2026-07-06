Plan to fix the empty inbound log:

1. **Remove the fragile manifest receiver restriction**
   - Update `AndroidManifest.xml` so `SmsInboundReceiver` no longer requires `android.permission.BROADCAST_SMS` on the receiver declaration.
   - Keep `RECEIVE_SMS` permission and the `SMS_RECEIVED` intent filter.

2. **Add a second inbound capture path while the bridge is enabled**
   - In `SmsSyncService`, dynamically register an SMS receiver for `Telephony.Sms.Intents.SMS_RECEIVED_ACTION` while the foreground service is running.
   - Unregister it safely when the service stops.
   - This gives the app a live receiver path even if the OEM/device blocks or ignores the manifest receiver.

3. **Make the log prove whether the APK/service is actually active**
   - Append log entries on app launch, permission request result, Save & Start, service start, dynamic receiver registration, and service stop.
   - If the log remains empty after opening the app, then the installed APK is not the updated build or file logging is failing.
   - If service/start logs appear but no SMS logs appear, then Android/OEM/RCS is not delivering `SMS_RECEIVED` to this app.

4. **Add an inbound self-test button**
   - Add a “Test inbound log” button that writes a local log entry immediately.
   - Add a “Test forward inbound” button that posts a dummy inbound SMS to `sms-inbound` using the saved Supabase URL/token.
   - This separates local receiver problems from network/API problems.

5. **Keep server-side unchanged**
   - No database, web app, or edge function changes unless the self-test forward reaches `sms-inbound` and returns a real server error.

Expected result after installing the rebuilt APK:
- Opening the app creates log entries.
- Save & Start logs service + dynamic receiver registration.
- A real SMS should log either `SMS_RECEIVED ... posting` or show that Android never delivered the SMS broadcast.
- The forward self-test confirms whether Supabase posting works independently of Android SMS delivery.