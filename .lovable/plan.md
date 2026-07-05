
# SMS Bridge (Lovable ↔ Android)

Send scheduled/mass SMS to students using your own Android phone's SIM, and log all inbound replies back into the webapp as threaded conversations.

## Architecture

```text
+-------------------+       HTTPS        +---------------------+
|  Lovable Webapp   |  <-------------->  |   Supabase (DB +    |
|  (control panel)  |                    |   Edge Functions)   |
+-------------------+                    +----------+----------+
                                                    ^
                                          HTTPS     |  Bearer <DEVICE_TOKEN>
                                                    |
                                            +-------+--------+
                                            |  Android App   |
                                            |  (your phone,  |
                                            |   SIM + SMS)   |
                                            +----------------+
```

The Android app:
- polls `sms-fetch-pending` every ~60s for due messages,
- sends them via `SmsManager`, **waiting 3 seconds between each send** to avoid carrier throttling,
- reports delivery status back,
- listens for incoming SMS and POSTs to `sms-inbound`.

## Part 1 — Lovable (Supabase + webapp)

### Database (new tables)

- **sms_campaigns** — one row per compose action. Fields: name, body, status (draft/scheduled/sending/completed/cancelled), scheduled_at, created_by, filters_json (branch_id, term_id, class_type, active-only, etc.), total_count, sent_count, failed_count.
- **sms_outbound** — one row per recipient. Fields: campaign_id (nullable for one-offs), student_id (nullable), phone (E.164), body, status (queued/sent/failed/delivered), send_at, sent_at, error, device_message_id.
- **sms_threads** — one row per phone number. Fields: phone, student_id (best-match), last_message_at, last_direction, unread_count.
- **sms_messages** — unified inbound+outbound message log for threading. Fields: thread_id, direction (in/out), phone, body, sent_at, outbound_id (nullable), status.
- **sms_devices** — registered phones. Fields: label, token_hash, last_seen_at, active, send_delay_ms (default 3000).

RLS: all tables authenticated-only; admin/superadmin write; staff of a branch can read messages for students in their branch (mirrors existing `employee_branch_access` pattern).

### Edge functions (device-facing, token-authed, no JWT)

- **sms-fetch-pending** (GET) — device sends `Authorization: Bearer <DEVICE_TOKEN>`; returns up to N `sms_outbound` rows where `status='queued'` and `send_at <= now()`, marks them `sending`. Response also includes the device's configured `send_delay_ms`.
- **sms-report-status** (POST) — device confirms `{outbound_id, status, error?, device_message_id?}`. Updates row + campaign counters + upserts into `sms_messages` (direction=out).
- **sms-inbound** (POST) — device posts `{phone, body, received_at}`. Normalises phone to E.164, finds/creates `sms_threads` row (matches to `students.phone` if possible), inserts into `sms_messages` (direction=in), bumps `unread_count`, triggers existing push-notification function to notify staff of that branch.
- **sms-register-device** (POST, one-off, superadmin JWT) — issues a new device token, stores hash.

Device auth: token stored hashed in `sms_devices`; raw token shown once at registration and pasted into the Android app.

### Webapp UI

New "SMS" section in the sidebar (admin/superadmin only):

1. **Compose / New Campaign** page
   - Message body (with `{first_name}` merge tag, char counter, SMS-segment counter).
   - Recipient filters: branch (multi), term, class_type, belt, active status; live preview of matched students & count.
   - Manual add: paste extra numbers.
   - Schedule: "Send now" or date/time picker (uses `formatDate` DD/MM/YYYY per project convention).
   - Estimated completion time shown (recipients × 3s + overhead) so you know how long a batch will take.
   - On submit: creates `sms_campaigns` row and expands into `sms_outbound` rows (one per unique recipient, dedup by phone).

2. **Campaigns** list — status, scheduled_at, sent/total, quick cancel (marks remaining queued rows cancelled).

3. **Conversations** (threaded) — left pane list of `sms_threads` (sorted by last_message_at, unread badge). Right pane message bubbles (out = right/blue, in = left/grey), quick reply box that inserts a single-recipient `sms_outbound` row.

4. **Devices** page — register phone, show one-time token, show `last_seen_at`, editable **Send delay (ms)** field (default 3000).

## Part 2 — Android app (Kotlin, delivered as Android Studio project)

Minimal single-activity app. Included source:

- `MainActivity` — config screen: Supabase URL, device token, poll interval, **send delay (default 3000ms)**, enable/disable toggle. Stored in EncryptedSharedPreferences. Delay also refreshed from server on every fetch.
- `SmsSyncWorker` (WorkManager, periodic ~15min minimum; plus an `AlarmManager` exact-alarm for tighter scheduling if you need <15min) — calls `sms-fetch-pending`, then iterates the batch: send one via `SmsManager.sendTextMessage()`, await sent `PendingIntent` result, report status, `delay(3000)`, next. This guarantees a 3s gap between messages even within one poll cycle.
- `SmsReceivedReceiver` (BroadcastReceiver on `android.provider.Telephony.SMS_RECEIVED`) — parses PDUs, POSTs to `sms-inbound`.
- `SmsSentReceiver` — captures per-message success/failure, updates outbound status.
- Foreground service with a persistent notification ("SMS bridge active") — required to keep receivers reliable on modern Android.
- Permissions requested at runtime: `SEND_SMS`, `RECEIVE_SMS`, `READ_PHONE_STATE`, `POST_NOTIFICATIONS`, `FOREGROUND_SERVICE`.

You install the resulting APK via Android Studio → Run on your phone (sideload; not intended for Play Store).

## Caveats

- **Throughput.** With the 3s gap, sustained rate is ~20 SMS/minute (~1,200/hour theoretical). Carriers may still throttle sooner on consumer SIMs.
- **Android SMS restrictions.** Google Play forbids SMS-permission apps except default SMS handlers; this app is designed for sideloading only.
- **Delivery cost.** Each SMS uses your SIM's plan / per-SMS rate.
- **Phone must be on, unlocked periodically, and connected to internet.** Doze mode can delay polls; foreground service + exact alarms mitigate but don't fully remove this.
- **Phone number matching.** Inbound match to a student uses last 8 digits of phone (SG-friendly); ambiguous matches fall back to phone-only thread.

## Suggested build order

1. Migration: create the 5 tables + RLS + grants.
2. Edge functions: `sms-register-device`, `sms-fetch-pending`, `sms-report-status`, `sms-inbound`.
3. Webapp: Devices page → Compose/Campaigns → Conversations.
4. Android Studio project scaffold + config screen + worker (with 3s inter-send delay) + receivers.
5. End-to-end test: register device, send 3 SMS to yourself, confirm ~3s spacing, reply, verify thread.

Approve to proceed, or tell me what to adjust.
