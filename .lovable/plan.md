# Fix: Little Gaonhae planner must not offer Team Gaonhae / Private Lesson slots

## Problem
On `/hello`, when a student (e.g. BOYI YAP, Yishun) selects a **Little Gaonhae** package and opens the lesson planner, slots like **18:30–19:30 · Team Gaonhae Poomsae** are still offered. The planner already filters by the package's `allowed_class_types`, but any gap in that metadata (or a class type not in the list) lets ineligible slots through.

Confirmed data:
- Little Gaonhae products have `allowed_class_types: ["Little Gaonhae"]` — so Team Gaonhae should already be excluded.
- Yishun's Tuesday 18:30 Team Gaonhae Poomsae slot has no age limit and covers all belts, so it reaches the planner whenever filtering falls open.

## Fix (frontend, `src/pages/public/PublicHelloChat.tsx`)

1. **Name-based fallback filter** — if the selected package has no `allowed_class_types` metadata and its name starts with "Little Gaonhae", restrict the planner to `Little Gaonhae` class slots only.
2. **Strict exclusion rule** — in the planner's slot filter:
   - `Private Lesson` slots are never bookable through school-fee planning.
   - `Team Gaonhae ...` slots appear only when the package's `allowed_class_types` explicitly includes that class type.
   - All other slots still require a match against the package's allowed class types (unchanged behavior when metadata is present).
3. Empty-day messaging already exists ("No classes available..."), so days with no eligible slot stay disabled automatically.

## Verification
- Type-check and build.
- Drive `/hello` in the browser as BOYI YAP (Yishun, DOB 28/02/2020), select the Little Gaonhae package, open the planner, and confirm Tuesday shows only eligible Little Gaonhae slots (no Team Gaonhae Poomsae), and a Foundation to Red package still shows its wider class list.
