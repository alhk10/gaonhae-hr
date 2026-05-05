
UPDATE storage.buckets
SET public = true
WHERE id IN ('claim-receipts','student-photos','payment-proofs','receipts','notice-attachments');
