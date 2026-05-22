UPDATE public.entitlements
SET valid_from = '2026-04-28',
    valid_to = '2026-07-03',
    updated_at = now(),
    updated_by = 'system: realign to invoice item term 2'
WHERE id = 'cb7fa734-abfa-4a7a-a7e0-b3f12517cd0e'
  AND source_type = 'invoice_item'
  AND source_id = '91927ac6-7278-49ca-b733-dc1aef2af5a0';