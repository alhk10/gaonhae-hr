## Plan

Replace the basic `<Input type="file">` certificate field on `/comps` (PublicCompetitionPayment.tsx, lines 381–404) with the existing `ProofOfPaymentUpload` component so it matches the proof-of-payment design (dashed dropzone, click/drag/paste, take-photo, image preview, remove button).

### Change
In `src/pages/public/PublicCompetitionPayment.tsx`:
- Import `ProofOfPaymentUpload`.
- Replace the certificate block with:
  ```tsx
  <ProofOfPaymentUpload
    value={certificateFile}
    onChange={setCertificateFile}
    required
    acceptPdf={false}
    maxSizeMB={5}
    label="Certificate Upload (Poom/Dan)"
  />
  <p className="text-xs text-muted-foreground">
    Please upload a clear photo of your Poom or Dan certificate.
  </p>
  ```

No business logic changes — `certificateFile` state and submission flow remain identical.
