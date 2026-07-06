## Diagnosis

The scan result — **checked 50, forwarded 0, failed 0** — is the smoking gun. The scanner read 50 rows from the Android SMS inbox and every one was either already processed or older than 24h. Zero *new* SMS rows appeared for the message you're testing with.

Combined with **Google Messages + RCS ON**, the cause is almost certainly:

> The test message is arriving as **RCS / Chat**, not as classic SMS. RCS messages are stored in Google Messages' private database and are **not** exposed to third-party apps via `content://sms/inbox` or the `SMS_RECEIVED` broadcast. No amount of Android-side polling or receiver work can see them — the OS never hands them to us.

The self-test worked earlier because it bypasses the phone entirely and POSTs directly to `/sms-inbound`. Outbound sending works because `SmsManager.sendTextMessage` forces a classic SMS. Only *inbound* from an RCS-capable peer is invisible.

## Verification steps (do these first, before any code change)

1. On the sending phone, disable RCS/Chat features (Google Messages → Settings → RCS chats → off), or send from a phone/service that doesn't support RCS (e.g. a shortcode, a bank OTP, or an iPhone with iMessage off to your number).
2. Send a fresh test SMS. In Google Messages the thread bubble should be **green (SMS)**, not blue (Chat).
3. In SMS Bridge tap **Scan phone inbox now**. Expect `forwarded ≥ 1` and the message to appear in the Conversations tab.

If step 3 forwards the message, RCS was the whole problem. If it still shows `forwarded 0`, we have a different bug and I'll dig into the log line for that specific SMS.

## Code changes (small, UX-only)

Only after we confirm RCS is the cause, add these so future users aren't stuck:

1. **`SmsInboxScanner.kt`** — track `newRows` (rows newer than the saved cursor). When `checked > 0` but `newRows == 0`, return a warning: *"No new SMS in the Android inbox. If your test message appears in Google Messages as a Chat (blue) bubble, it's RCS and Android will not expose it to third-party apps. Disable RCS/Chat features on the sender to test."*
2. **`MainActivity.kt`** — surface that warning in the toast and status line after a manual scan, and add a one-line note under the "Scan phone inbox now" button: *"RCS/Chat messages cannot be forwarded — only classic SMS."*
3. **`android/README.md`** — add a short "Known limitation: RCS" section with the same explanation and the workaround.

No changes to the receiver, service, edge function, or Supabase schema. The forwarding pipeline is already proven working by the self-test.

## Why not "just read RCS too"

Google Messages' RCS store is a private app database with no public API; reading it requires being the system default SMS app *and* reverse-engineering an undocumented schema that changes between versions. Not viable for a sideloaded bridge APK.

## Summary

Please run the 3 verification steps above and tell me what happens. If a non-RCS SMS forwards, I'll implement the UX warnings. If it still doesn't forward, paste the new log lines and I'll debug from real evidence instead of guessing.