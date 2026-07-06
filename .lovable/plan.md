## Plan

1. **Add an Android inbox fallback**
   - Keep the existing SMS broadcast receiver.
   - Add a periodic `Telephony.Sms.Inbox` scan inside `SmsSyncService` using `READ_SMS`.
   - Forward any unread/new inbox SMS that has not already been processed.
   - Store the last processed SMS timestamp/id locally so old messages are not re-sent after app restart.

2. **Strengthen duplicate protection**
   - Use a stable key from sender + timestamp + body hash for both broadcast and inbox-polled messages.
   - Share the same forwarding function so both paths write identical inbound logs and call `/sms-inbound` the same way.

3. **Improve APK diagnostics**
   - Add log lines such as `inbox poll checked N messages`, `inbox poll forwarded`, and exact forwarding failures.
   - Show whether `READ_SMS`/`RECEIVE_SMS` are granted, bridge is enabled, and service is running.

4. **Verify server path remains unchanged**
   - The web conversations tab already reads `sms_threads`/`sms_messages`.
   - The `sms-inbound` edge function already creates those records, so the likely missing piece is the APK never posting inbound SMS.

5. **Expected result**
   - Even if Android/OEM blocks the SMS broadcast, the foreground service will detect received messages from the phone inbox and forward them into the Conversations tab.