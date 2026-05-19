## Goal

Suppress certificate generation (inline Award button + bulk download) for grading rows whose product is one of the non-certificate types.

## Excluded products

Match `product_name` (case-insensitive, trimmed) against:

- `Stage 1 - 3`
- `Stage 4 - 10`
- `Stage 11-26`
- `Provisional Pass Confirmation Grading`

These are the exact names already in the `products` table.

## Change

**`src/pages/public/PublicGradingList.tsx`** — extend `isCertEligible` (lines 904-907):

```ts
const NON_CERT_PRODUCTS = new Set([
  'stage 1 - 3',
  'stage 4 - 10',
  'stage 11-26',
  'provisional pass confirmation grading',
]);

const isCertEligible = (r: PublicGradingListRow): boolean =>
  !!r.grading_date
  && !!r.current_belt
  && (r.result === 'pass' || r.result === 'double')
  && !NON_CERT_PRODUCTS.has((r.product_name ?? '').trim().toLowerCase());
```

This single gate already controls:
- The inline Award icon (line 1273 `{isCertEligible(r) && ...}`)
- The bulk "Certificates (N)" download (line 967 skips non-eligible rows)
- The per-row certificate checkbox visibility (also gated by `isCertEligible`)

## Out of scope

No DB / RPC / signature / dialog changes. Pass/Double result handling for other products is unchanged.
