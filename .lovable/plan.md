

## Plan: Optimize PDF Generation Speed and File Size

### Root Cause
The `loadImage` function in `invoicePDFGenerator.ts` converts all images (logo, QR code) to **PNG data URLs** via canvas (`canvas.toDataURL('image/png')`). PNG is lossless and produces very large base64 strings — this is the primary driver of the 4MB file size and slow generation.

### Changes

#### 1. Use JPEG compression for image encoding (`invoicePDFGenerator.ts`)
- Change `canvas.toDataURL('image/png')` to `canvas.toDataURL('image/jpeg', 0.7)` in the `loadImage` function
- Update `addImage` calls to use `'JPEG'` format instead of `'PNG'`
- For the QR code specifically, keep PNG format but **downscale the canvas** to the actual rendered size (e.g., 168x168 px for a 42mm image at 96 DPI) instead of using the full source resolution

#### 2. Downscale images to target render size
- Before drawing to canvas, resize to the actual dimensions needed in the PDF (no need for a 2000px image when it renders at 70px wide)
- Add a `maxWidth`/`maxHeight` parameter to `loadImage` to cap canvas dimensions

#### 3. Apply same optimizations to other PDF generators
- `payslipPDFGenerator.ts` — uses `logoImg` directly with `addImage(logoImg, 'JPEG', ...)` which is already reasonable, but can benefit from downscaling
- `casualPayslipPDFGenerator.ts` — same pattern
- `verificationLetterPDFGenerator.ts` — likely has similar image loading; apply same compression

#### 4. Use jsPDF compression option
- Pass `{ compress: true }` to `new jsPDF({ compress: true })` to enable stream compression on the output PDF

### Expected Impact
- **File size**: ~4MB → ~200-500KB (8-20x reduction)
- **Speed**: Image encoding is the bottleneck; smaller canvases + JPEG = significantly faster

### Files to modify
- `src/utils/invoicePDFGenerator.ts` — compress flag, JPEG encoding, image downscaling
- `src/utils/payslipPDFGenerator.ts` — compress flag, image downscaling
- `src/utils/casualPayslipPDFGenerator.ts` — compress flag, image downscaling
- `src/utils/verificationLetterPDFGenerator.ts` — compress flag, JPEG encoding, image downscaling

