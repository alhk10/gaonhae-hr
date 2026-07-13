## Goal
In SMS Bridge → Conversations, show the matched student name above the phone number in each thread row and in the selected-thread header.

## Changes

**src/pages/SmsBridge.tsx (`ConversationsTab`)**
1. Add a `phoneToName` state (`Record<string, string>`).
2. After `loadThreads()` resolves, collect distinct normalized phones and query `students` (`id, first_name, last_name, phone`) via a single `.in('phone', phones)` fetch. Build the map keyed by `normalizePhone(phone)` → `"FIRST LAST"` (uppercase to match project convention). Merge in existing map so lookups persist while switching.
3. In the thread list row (~line 568-570): render two lines:
   - Line 1: student name (font-medium text-sm) — fallback to phone if no match.
   - Line 2: phone (text-xs text-muted-foreground).
   - Keep unread badge aligned right.
4. In the selected thread card title (~line 583): show `name • phone` when name exists, else phone.

## Out of scope
- No schema changes; no changes to Compose/Manual/Campaigns/Devices.
- No changes to smsService (query lives in the component to avoid broad service refactor).
