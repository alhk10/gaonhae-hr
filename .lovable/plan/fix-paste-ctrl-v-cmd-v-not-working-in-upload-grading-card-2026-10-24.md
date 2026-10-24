## Fix: paste (Ctrl+V / Cmd+V) not working in "Upload grading card"

### What's wrong
The dialog shows "or paste an image (Ctrl+V)" and has the paste-handling logic, but that logic was never connected to the dialog. Pressing Ctrl+V does nothing.

### Fix
- Listen for paste anywhere on the page while the "Upload grading card" dialog is open (not only when a specific box has focus), so Ctrl+V works right after the dialog opens.
- Pasted images (screenshots, copied images, or image/PDF files copied from a folder) are added to the list, respecting the 2-file limit, with the existing "only images or PDF" and "maximum reached" messages.
- When an existing card is enlarged, paste replaces that card (existing behaviour intended).
- Show a short confirmation ("Image pasted") and a clear message if the clipboard has no image (e.g. only text was copied).
- Stop listening when the dialog closes so paste elsewhere is unaffected.

### Check
- Open the dialog in the preview and simulate a paste of an image; confirm it appears in the list and the counter shows "1 of 2".

### Technical details
- File: `src/components/grading-list/GradingCardUploadDialog.tsx`.
- Add a `useEffect` that registers a `document` `paste` listener when `open` is true, reusing `clipboardFiles`/`handlePick`/`handleReuploadPick` (adapted to native `ClipboardEvent`), with refs to avoid stale `remaining`/`enlarged` values; skip if the event target is a text input/textarea.
