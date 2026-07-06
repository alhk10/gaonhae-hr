# Add manual phone-number sending

Currently the Compose tab only targets students filtered from the database, and Conversations only lets you reply to existing threads. This adds a way to send SMS to any phone number typed by hand — no student record required.

## What the user sees

New **"Manual"** sub-tab inside the SMS Bridge page (alongside Compose / Campaigns / Conversations / Devices), containing one card:

- **Phone numbers** — textarea, one per line or comma-separated. Accepts local (e.g. `91234567`) or E.164 (`+6591234567`). Numbers are normalized, de-duplicated, and invalid ones are highlighted before send.
- **Recipient name (optional)** — used for the `{first_name}` merge tag. Applies to all numbers in this batch. If blank, `{first_name}` renders as an empty string.
- **Message body** — same textarea/segment counter as Compose. Same `{first_name}` merge tag.
- **Send now / Schedule at** — same controls as Compose.
- Summary line: unique valid numbers, per-message delay from the paired device, estimated completion.
- **Send** button.

On submit it calls the existing `createCampaign` service with `recipients: [{ student_id: null, phone, first_name }]` — no schema, no edge-function, no service changes needed. The campaign appears in the Campaigns tab, and any replies land in Conversations exactly like student-sourced sends. Campaign name auto-fills as `Manual send — DD/MM/YYYY HH:mm` if left blank.

## Also (small quality-of-life)

In the **Conversations** tab header, add a **"New conversation"** button that opens a small dialog: phone number + first message → uses `sendQuickReply(phone, body)`. This lets the user start a 1-to-1 chat with a brand new number without going through the Manual tab.

## Files changed

- `src/pages/SmsBridge.tsx` — add `<TabsTrigger value="manual">Manual</TabsTrigger>`, a new `ManualSendTab` component, and the "New conversation" dialog in `ConversationsTab`. Grid becomes `grid-cols-5`.
- No changes to `src/services/smsService.ts` — `createCampaign` and `sendQuickReply` already accept arbitrary phones and nullable `student_id`.
- No DB migration, no edge function, no new Supabase tables.

## Out of scope

- No opt-out / consent tracking for manual numbers (same behavior as today's campaigns).
- No CSV upload — only paste/type. Say the word if you want CSV too.
- No changes to the Android app or workflow.
