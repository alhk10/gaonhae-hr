## Problem

Submission fails with: `Could not find the 'email' column of 'grading_payment_submissions' in the schema cache`.

The frontend service inserts an `email` field, but the table has no `email` column.

## Fix

1. Migration: `ALTER TABLE public.grading_payment_submissions ADD COLUMN email text;`
2. No code changes needed — service already sends it.

Once approved, the schema cache will refresh and the Submit Payment button will work.