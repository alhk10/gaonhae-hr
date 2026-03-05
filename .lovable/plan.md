

## Plan: Fix Notice Popup Dialog for Mobile

The dialog's title text doesn't wrap and the image can overflow on narrow screens, causing horizontal scrolling.

### Changes

**File: `src/components/notices/NoticePopupDialog.tsx`**

1. **DialogContent**: Add `overflow-x-hidden w-[95vw] sm:w-full` to constrain width on mobile and prevent horizontal overflow.
2. **DialogTitle**: Add `break-words` class so long titles wrap instead of overflowing.
3. **Image**: Add `max-w-full` to ensure images shrink to fit the container.
4. **Content div**: Add `overflow-hidden break-words` to the content area to prevent any inner HTML from causing horizontal scroll.

### Files to modify
- **Edit**: `src/components/notices/NoticePopupDialog.tsx`

