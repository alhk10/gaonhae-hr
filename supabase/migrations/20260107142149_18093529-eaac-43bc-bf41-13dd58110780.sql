-- Add branch_id column to claims table for partner claims
ALTER TABLE public.claims ADD COLUMN branch_id VARCHAR;

-- Add index for faster lookups
CREATE INDEX idx_claims_branch_id ON public.claims(branch_id);