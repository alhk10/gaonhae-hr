REVOKE EXECUTE ON FUNCTION public.superadmin_pending_counts() FROM authenticated;
CREATE POLICY "No client access" ON public.superadmin_alert_state FOR SELECT TO authenticated USING (false);