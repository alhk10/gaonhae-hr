# Kyorugi Seminar Square: Change Master Jang's Pose

## Goal
Update `perth-2026-instagram-3-kyorugi-seminar.png` so Master Jang Heejae matches the original Kyorugi poster: white dobok with black belt, both hands holding/tightening the belt at his waist — replacing the current full sparring gear (helmet, chest guard, gloves) kicking pose.

## Approach
- Use `imagegen--edit_image` on the existing square (`/mnt/documents/perth-2026-instagram-3-kyorugi-seminar.png`), editing only the figure on the right.
- Prompt: replace the sparring-gear kicking figure with Master Jang Heejae's likeness from the original poster — white Adidas dobok, black belt held with both hands at the waist, calm standing pose, facing the viewer — matching the poster's reference photo.
- Keep all text, dates, times, prices, venue, caps, red/blue brush strokes, logo and "Register at gaonhae.app/perthcomp" unchanged. Do not resize (stay 1024x1024).

## Verification
- View the edited image and confirm: belt-holding pose, no sparring gear, all event details and layout intact, no dropped elements.
- If the edit degrades surrounding text or strokes, retry with a tighter prompt.

## Files
- Overwrite `/mnt/documents/perth-2026-instagram-3-kyorugi-seminar.png` (the `_v2` backup remains untouched).

## Notes
- The edited figure is an AI-recreated likeness of the poster's reference photo, not an exact photographic cut-out.
- If the bottom-right Gaonhae logo gets dropped again during the edit, restore it in a follow-up inpaint pass.
