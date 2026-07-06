## Plan

1. **Treat the server path as working**
   - The inbound self-test appearing in Conversations confirms the QR pairing, device token, Supabase URL, anon key, and `/sms-inbound` edge function are working.
   - The remaining failure is on the Android side: real SMS broadcast/inbox detection is not producing a forward.

2. **Add a manual inbox scanner button**
   - Add **Scan phone inbox now** to the APK.
   - This will immediately read the latest SMS rows from `content://sms/inbox` and forward any not-yet-processed messages.
   - This avoids waiting for the background service poll interval and gives an immediate diagnostic result.

3. **Make inbox polling broader and more reliable**
   - Change the inbox fallback to query the latest SMS rows by `date DESC` instead of relying only on `date >= cursor`.
   - This handles OEM/provider timestamp quirks and cursor mistakes.
   - Keep duplicate protection so old messages are not repeatedly forwarded.

4. **Run inbox scan on key events**
   - Run a scan after **Save & Start**.
   - Run a scan after SMS permissions are granted.
   - Keep the existing foreground service periodic polling as the background fallback.

5. **Improve logs for real SMS diagnosis**
   - Log whether the inbox query returned rows.
   - Log sender/date/body length for each candidate SMS without exposing full message body.
   - Log clear outcomes: `forwarded`, `already processed`, `failed`, or `permission missing`.

6. **Add user-facing warning for unsupported message type**
   - If inbox scanning returns no SMS rows while the user sees the message in their messaging app, show a note that RCS/chat messages are not exposed as SMS to third-party apps; only carrier SMS/MMS in the Android SMS provider can be forwarded.