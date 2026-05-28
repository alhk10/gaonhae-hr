# Fix /comps Submit Payment disabled

## Root cause

`/comps` is a public (anon) page, but `getCompetitionProducts()` in `src/services/competitionPaymentSubmissionService.ts` queries the `products` table directly:

```ts
supabase.from('products').select('id, name, base_price, tax_rate, kind').eq('kind','competition').eq('is_active', true)
```

The `products` table's RLS policies only permit `authenticated` roles (`view_active_products` → role `authenticated`; `superladmin_manage_products` → role `authenticated`). For anon visitors the query returns `[]`, so:

- `coachingProduct` is `undefined` → the Coaching Fee block never renders
- `categoryProducts` is `[]` → the Event Categories block never renders
- `totalAmount` is `0` → button shows "Submit Payment" (no amount) and `canSubmit` stays `false`

The user believes they filled in all visible fields, but the form's required product selectors were silently hidden.

## Plan

### 1. Add a public RPC `get_public_competition_products`

`SECURITY DEFINER`, granted to `anon, authenticated`, returns only `kind='competition' AND is_active=true` rows with columns `id, name, base_price, tax_rate, kind`. Mirrors the access pattern already used by `get_public_payment_options` / `get_public_branches`.

### 2. Switch the client to the RPC

In `src/services/competitionPaymentSubmissionService.ts`, replace the direct table query in `getCompetitionProducts` with `supabase.rpc('get_public_competition_products')`.

### 3. Add a defensive UX safeguard on the form

In `src/pages/public/PublicCompetitionPayment.tsx`, when `branchId && dob && currentBelt` are set but `products.length === 0` (loaded query, empty result), render a small inline `<Alert>` explaining "No competition products are currently available. Please contact the academy." This prevents the same silent failure if products are ever deactivated in future.

No other behavior changes. Frontend logic for `canSubmit`, certificate upload, proof upload, and the submit RPC stay as-is.
