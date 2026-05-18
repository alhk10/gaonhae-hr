## PDF redesign for `/grading-list` Download (PublicGradingList.tsx → `handleDownloadPdf`)

### 1. Header
- Replace the current centered "Grading List" + subtitle stack with a single centered title: **`GRADING LIST FOR <DD/MM/YYYY>`** (uses `formatDate(dateFilter)`). If `dateFilter === 'all'`, title is `GRADING LIST FOR ALL DATES`.
- Add **Gaonhae Taekwondo logo** in the top-right corner, proportionate (≈18mm wide, height auto from aspect ratio), bottom-aligned with the header text baseline.
  - Source: `public/lovable-uploads/gaonhae-logo-transparent.png` — preloaded into an `<img>`, drawn into a canvas to get a base64 PNG, then `doc.addImage(...)`.
  - Loaded once before `doc.output()`.

### 2. Per-group card header (in-body)
- Remove the secondary `28/06/2026 · 10:00` subtitle line under each group title. Only `slot_title || fallback` remains as the bold group heading.
- Drop the related `sub` rendering and the `g.header.slot_title ? 3.2 : 0` height fudge in the layout estimate.

### 3. Footer (every page)
After all groups render, iterate `1..doc.getNumberOfPages()` and draw:
- **Center**: `Page X of N` (8pt, muted grey).
- **Bottom-right**: `Generated DD/MM/YYYY HH:mm` (8pt, muted grey) — uses `formatDateTime(new Date())`.
- **Bottom-left**: leave empty (or repeat doc title — choose empty for cleanliness).
Footer baseline at `pageH - 6mm`.

### 4. Color-code Branches and Status

Add deterministic hash → palette helpers (kept local to the PDF function):

- **Branch chip**: derive an HSL from `branch_name` (stable hash mod N over a curated palette of 10 light-fill / dark-text pairs). Render the branch cell as a small filled rectangle with the branch name in dark text. Use `autoTable`'s `didParseCell` hook to set `cell.styles.fillColor` and `textColor` for column index 1.
- **Status chip**: fixed mapping
  - `paid` → green fill `#DCFCE7`, text `#166534`
  - `verified` → blue fill `#DBEAFE`, text `#1E40AF`
  - `pending_verification` → amber fill `#FEF3C7`, text `#92400E`
  - `rejected` → red fill `#FEE2E2`, text `#991B1B`
  - default → grey fill `#F1F5F9`, text `#334155`
  Applied via the same `didParseCell` hook on column index 4.

### 5. Layout adjustments
- Bump `contentTop` slightly (header height grows with the logo): `contentTop = margin + 18`.
- Footer reserves bottom space: `contentBottom = pageH - margin - 8`.
- Remove the per-group subtitle height (`3.5mm`) from `estH`.

### Files
```text
src/pages/public/PublicGradingList.tsx   — handleDownloadPdf rewrite (header, footer,
                                            logo, status/branch color hooks, drop
                                            per-group subtitle)
```

### Out of scope
- No changes to on-screen table rendering (web UI keeps the existing group subtitle).
- No new assets — uses existing `gaonhae-logo-transparent.png`.
