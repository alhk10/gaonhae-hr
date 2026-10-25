REVOKE EXECUTE ON FUNCTION public._lesson_balance(uuid,text,date,date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._lesson_bookings_entitlement() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._lesson_bookings_validate() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._access_branch_check(text,text) FROM PUBLIC, anon, authenticated;