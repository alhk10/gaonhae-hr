
ALTER TABLE public.journal_entries DROP CONSTRAINT journal_entries_country_check;
ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entries_country_check
  CHECK (country IN ('Singapore','Australia'));
