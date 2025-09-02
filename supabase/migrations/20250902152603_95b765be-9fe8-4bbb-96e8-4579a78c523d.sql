-- Fix the admin_reset_password function to use the correct superadmin check
CREATE OR REPLACE FUNCTION public.admin_reset_password(
  target_email text,
  new_password_hash text,
  new_salt text
) RETURNS void AS $$
BEGIN
  -- Only allow superadmins to call this function
  IF NOT EXISTS (
    SELECT 1 FROM public.superadmin_users 
    WHERE employee_email = auth.jwt() ->> 'email' 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: Superadmin privileges required';
  END IF;

  -- Update or insert password record
  INSERT INTO public.user_passwords (
    email, 
    password_hash, 
    salt, 
    must_change_password, 
    requires_change, 
    password_complexity_met, 
    last_password_change, 
    failed_attempts, 
    locked_until
  ) VALUES (
    target_email,
    new_password_hash,
    new_salt,
    true,
    true,
    false,
    now(),
    0,
    null
  )
  ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    salt = EXCLUDED.salt,
    must_change_password = true,
    requires_change = true,
    password_complexity_met = false,
    last_password_change = now(),
    failed_attempts = 0,
    locked_until = null,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;