

## Plan: Drag-drop, paste, and camera upload for Proof of Payment

### What changes

Replace the four existing "Upload Proof of Payment" inputs with a single shared component that supports: click-to-browse, **drag-and-drop**, **clipboard paste (Ctrl/Cmd+V)**, and **camera capture** (mobile + supported desktops).

### New shared component

**`src/components/payment/ProofOfPaymentUpload.tsx`** (new file)

A self-contained dropzone with this behaviour:

- **Click to browse** — opens the file picker (existing behaviour preserved).
- **Camera button** — separate icon button using `<input type="file" accept="image/*" capture="environment">`. On mobile this opens the rear camera; on desktop without a camera it falls back to the file picker.
- **Drag-and-drop** — the dropzone responds to `dragenter`/`dragover`/`dragleave`/`drop`. Shows a highlighted ring (`border-primary bg-primary/5`) while a file is hovering. On drop, takes the first file and validates.
- **Paste from clipboard** — when the dropzone is focused (it becomes `tabIndex={0}`), `paste` event reads `e.clipboardData.files[0]` (e.g. screenshot copied via Snipping Tool / Cmd+Shift+Ctrl+4). A small "Tip: paste with Ctrl/Cmd+V" hint appears under the box.
- **Validation** — image-only by default (`accept="image/*"`), max 5MB, with optional `acceptPdf` prop for places that allow PDF. Reuses the same `toast.error` patterns used today ("Only image files are accepted for payment proof", "File must be smaller than 5MB").
- **Preview** — when a file is set, shows filename, size, a thumbnail (for images via `URL.createObjectURL`), and an X button to clear. Object URL is revoked on unmount/clear.
- **Props**:
  ```ts
  {
    value: File | null;
    onChange: (file: File | null) => void;
    required?: boolean;
    acceptPdf?: boolean;       // default false
    maxSizeMB?: number;        // default 5
    label?: string;            // default "Proof of Payment"
    compact?: boolean;         // smaller variant for CreatePaymentDialog
    disabled?: boolean;
  }
  ```
- **Accessibility** — `role="button"`, `aria-label`, keyboard `Enter`/`Space` triggers file picker, focus ring visible.

### Call sites updated to use the new component

1. `src/components/sales/CreatePaymentDialog.tsx` (line 616–656) — use `compact` variant.
2. `src/components/dashboard/PayGradingDialog.tsx` (line 803–838).
3. `src/components/dashboard/PaySchoolFeesDialog.tsx` (line 991–1026).
4. `src/components/notices/NoticePopupDialog.tsx` (line 188–207).

Each call site simply renders:
```tsx
<ProofOfPaymentUpload value={proofFile} onChange={setProofFile} required />
```
and removes the now-unused `<input type="file">`, `fileInputRef`, and the inline button/label markup. All upload/save logic downstream is unchanged because `proofFile` (a `File`) remains the contract.

### Behaviour after change

| Interaction | Result |
|---|---|
| Click the dropzone | Opens file picker |
| Drag image onto the dropzone | Highlight, drop sets file |
| Copy a screenshot, focus dropzone, Ctrl/Cmd+V | File is set from clipboard |
| Tap the Camera button on mobile | Opens device camera, captured photo becomes the file |
| Drop / paste / select a non-image (when PDF disallowed) | Toast error, file rejected |
| File > 5MB | Toast error, file rejected |
| File set | Shows thumbnail + filename + size + Clear (X) |

### Files affected

- **New**: `src/components/payment/ProofOfPaymentUpload.tsx`
- **Edited**: `CreatePaymentDialog.tsx`, `PayGradingDialog.tsx`, `PaySchoolFeesDialog.tsx`, `NoticePopupDialog.tsx`

No service/Supabase changes — only the UI capture surface is upgraded; uploaded `File` objects continue to flow through `uploadProofOfPayment` exactly as today.

### Verification

1. Open Branch Dashboard → Record Payment → drag a screenshot onto the dropzone → preview appears, Record Payment enabled.
2. Copy a screenshot to clipboard, click into the dropzone, press Ctrl/Cmd+V → file accepted, preview shown.
3. On mobile, tap the Camera icon in the dropzone → camera opens → captured photo populates the file.
4. Try to drop a `.txt` file → toast error, no file set.
5. Same flow works in Pay Grading, Pay School Fees, and Notice payment popups.
6. Clearing (X) removes the preview and clears the file.

### Out of scope

- Multi-file uploads (still single file).
- Server-side image processing/compression.
- Receipt OCR or auto-fill of reference number.
- Other upload surfaces (claim receipts, certificates) — these already have their own upload UX and are unchanged.

