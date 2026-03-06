UPDATE entitlements
SET is_active = false, notes = 'Deactivated - orphaned (source invoice item missing)'
WHERE source_type = 'invoice_item'
  AND is_active = true
  AND source_id::uuid NOT IN (SELECT id FROM invoice_items);