## Problem

`generateBulkGradingCertificatesPDF` runs entirely synchronously on the main thread. With ~6+ certificates (each = certificate page + scorecard page + 3 embedded JPEGs) the browser blocks for 10–30+ seconds and Chrome shows the "Page Unresponsive" dialog.

## Fix overview

Two layers:

1. **Yield to the browser between certificates** — the heavy work is still on the main thread, but breaking it into per-certificate chunks separated by `await new Promise(r => setTimeout(r, 0))` lets the browser repaint, run the toast/progress UI, and avoids the "unresponsive" warning.
2. **Persistent progress UI** — a fixed-position toast in the bottom-right (using sonner's existing `<Toaster />`) shows "Generating certificates… 4 / 12 (33%)" with a progress bar, updated as each certificate is added. When done, it switches to a success toast and triggers the download.

A true Web Worker would be ideal but jsPDF's image embedding APIs use DOM-only `Image()` and canvas APIs in some code paths, and our generator imports JPEGs via the Vite asset pipeline — moving to a worker would require restructuring asset loading. The chunked-yield approach removes the freeze with a single small change and keeps all current code paths intact.

## Implementation

### 1. New async chunked bulk generator (`src/utils/gradingCertificatePDFGenerator.ts`)

Add a sibling to the existing sync function:

```ts
export const generateBulkGradingCertificatesPDFAsync = async (
  inputs: GradingCertificateInput[],
  onProgress?: (done: number, total: number) => void,
): Promise<jsPDF> => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  for (let idx = 0; idx < inputs.length; idx++) {
    if (idx > 0) doc.addPage('a4', 'portrait');
    drawCertificatePage(doc, inputs[idx]);
    drawScorecardPage(doc, inputs[idx]);
    onProgress?.(idx + 1, inputs.length);
    // Yield to the browser so it can repaint and stay responsive
    await new Promise(r => setTimeout(r, 0));
  }
  return doc;
};
```

The existing sync `generateBulkGradingCertificatesPDF` and `downloadBulkGradingCertificatesPDF` are kept for any other callers but the grading-list flow switches to the async one.

### 2. Progress toast in both list components

`src/components/sales/GradingListTab.tsx` and `src/components/dashboard/BranchGradingList.tsx`:

Replace the body of `runBulkDownload` with an async function that:
- Calls `toast.loading('Generating certificates… 0 / N', { id: toastId })` immediately so the user sees feedback in the bottom-right.
- Calls `generateBulkGradingCertificatesPDFAsync(inputs, (done, total) => toast.loading(\`Generating certificates… ${done} / ${total} (${pct}%)\`, { id: toastId, description: <Progress bar component or ASCII bar> }))`.
- On completion: `doc.save(filename)` then `toast.success(\`Generated ${inputs.length} certificates\`, { id: toastId })`.
- On error: `toast.error(...)` with the same id so the loading toast is replaced.

A single `toastId` (`'bulk-cert-progress'`) is reused so updates replace in place rather than stacking.

### 3. Disable double-click

Add a `bulkPrinting` boolean state. When true, the "Print Certificates (N)" button is disabled with a spinner, preventing the user from triggering a second concurrent generation.

### Files to edit

- `src/utils/gradingCertificatePDFGenerator.ts` — add `generateBulkGradingCertificatesPDFAsync`
- `src/components/sales/GradingListTab.tsx` — update `runBulkDownload` + button disabled state
- `src/components/dashboard/BranchGradingList.tsx` — same as above

No service, schema, or query changes.

**Approve to switch to default mode and implement.**