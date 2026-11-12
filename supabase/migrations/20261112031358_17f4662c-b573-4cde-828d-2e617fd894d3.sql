ALTER FUNCTION public._bank_ref_match(text, text) SET search_path = public;
REVOKE ALL ON FUNCTION public._bank_txn_validate() FROM PUBLIC, anon, authenticated;