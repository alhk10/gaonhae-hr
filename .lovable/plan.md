# /hello: Add to Home Screen prompt + per-student notifications

## 1. Add to Home Screen prompt
- After a student is recognised on /hello for the first time, show a short dialog: "Add Gaonhae to your Home Screen for quick access".
- Android/desktop Chrome: an **Add to Home Screen** button opens the browser's own install prompt.
- iPhone/iPad: step-by-step instructions (Share button, then "Add to Home Screen"), since Apple doesn't let websites trigger the install.
- Buttons: **Add** / **Not now**. Either choice hides the dialog for 150 days. After that it appears again at the next recognised login.
- Never shown when the app is already opened from the Home Screen.
- It shows after the outstanding-invoice popup, so the two don't stack.

## 2. Notifications for individual students
- After the Home Screen step (or from a new **Notifications** button in the /hello menu), parents can turn on notifications for the student they're currently viewing. Each sibling is turned on separately.
- Notifications sent to that student's subscribed devices:
  - New invoice issued / outstanding invoice reminder (weekly, same rhythm as the existing fees reminder)
  - Payment verified or rejected
  - Grading reminder (day before their booked grading)
  - New notices targeted at their branch
- Tapping a notification opens /hello.
- A **Turn off** option in the same menu. Devices that stop working are removed automatically.

## Technical details
- Home Screen prompt: capture `beforeinstallprompt`; detect iOS and standalone mode (`display-mode: standalone`); store `hello_a2hs_last_prompt` timestamp in localStorage and compare against 150 days. Uses existing `public/manifest.json` and `public/sw.js`.
- New table `student_notification_subscriptions` (student_id, endpoint, p256dh, auth, user_agent, timestamps; unique student_id+endpoint). RLS on, no anon/auth direct access; only `service_role` grants.
- SECURITY DEFINER RPCs `subscribe_public_chat_push(session, student, endpoint, p256dh, auth)` and `unsubscribe_public_chat_push(...)`, validated by `_validate_public_chat_session` and student ownership — same pattern as other /hello RPCs.
- Extend `push-notification` edge function to accept `student_ids` targets. Hook events: database webhook/trigger calls for invoice created and payment verification status change; extend `check-outstanding-fees`, `check-grading-reminders` and notice notification to include student subscriptions.
- Reuse the existing VAPID key and service worker; client helper in `pushNotificationService.ts` generalised to take a save callback.
