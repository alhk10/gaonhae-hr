# Video Grading slot (remark "Video Testing")

## What changes
- **New "Video grading slot" tick box** in Grading Events, beside "Double promotion slot". It works the same way:
  - Ticking it also hides the slot from /hello, and "Hidden from /hello" can't be unticked while it's on.
  - A slot can be Double promotion or Video grading, not both. Ticking one unticks the other.
  - The slot header shows a "Video grading" badge, like the Double promotion badge.
- **Remark "Video Testing":**
  - When staff set a student's grading remark to "Video Testing" (any capitals), the student moves into that event's Video grading slot.
  - If the event has no Video grading slot yet, one is created automatically (hidden, titled "Video grading").
  - Clearing or changing the remark moves the student back to their original slot, as "Double Testing" does today.
- This applies to both the registration remark and the payment-submission remark.

## Technical details
- **Migration:**
  - `_impl_set_grading_slot_meta` accepts `slot_kind = 'video_grading'`.
  - A new `_video_grading_slot(p_slot_id)` mirrors `_double_promotion_slot`.
  - `admin_update_grading_remark` and `admin_update_grading_submission_remark` handle `'video testing'` like `'double testing'`, using the original-slot fields for restore.
- **`GradingEventsSettingsDialog.tsx`:**
  - New checkbox.
  - Badge.
  - `is_hidden` is forced on for both special kinds.
