Add a rotate button to the certificate/proof preview dialog so the user can rotate the displayed image in 90° increments.

Scope:
- `src/pages/public/PublicGradingList.tsx` — CompetitionsTab preview Dialog (cert/proof thumbnails) and the main grading-list lightbox Dialog (proof viewer).

Implementation:
1. Add `const [rotation, setRotation] = useState(0)` in both dialog hosts. Reset to 0 when dialog opens/closes.
2. Add a `RotateCw` icon button in the DialogHeader (next to the title) that does `setRotation((r) => (r + 90) % 360)`.
3. Apply `style={{ transform: \`rotate(${rotation}deg)\` }}` and `transition-transform` to the image. Wrap image in a centered container so rotated 90/270 versions remain visible.
