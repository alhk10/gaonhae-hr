
-- =========================================================
-- 1. Realtime channel authorization by topic prefix
-- =========================================================

CREATE OR REPLACE FUNCTION public.can_subscribe_topic(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_emp_id text;
  v_student_id uuid;
  v_target text;
  v_prefix text;
BEGIN
  IF auth.uid() IS NULL OR _topic IS NULL THEN
    RETURN false;
  END IF;

  v_prefix := split_part(_topic, ':', 1);
  v_target := substring(_topic from position(':' in _topic) + 1);

  -- public:* — any authenticated user
  IF v_prefix = 'public' THEN
    RETURN true;
  END IF;

  v_role := public.get_current_user_role();

  -- superadmin can subscribe to anything
  IF v_role = 'superadmin' THEN
    RETURN true;
  END IF;

  IF v_prefix = 'superadmin' THEN
    RETURN false;
  END IF;

  -- employee:<employee_id>
  IF v_prefix = 'employee' THEN
    v_emp_id := public.get_current_employee_id();
    RETURN v_emp_id IS NOT NULL AND v_emp_id = v_target;
  END IF;

  -- branch:<branch_id>
  IF v_prefix = 'branch' THEN
    RETURN public.has_branch_access(v_target);
  END IF;

  -- student:<student_id>
  IF v_prefix = 'student' THEN
    -- the student themself
    IF EXISTS (
      SELECT 1 FROM public.student_auth
      WHERE auth_user_id = auth.uid() AND student_id::text = v_target
    ) THEN
      RETURN true;
    END IF;
    -- staff with branch access to this student's branch
    RETURN EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id::text = v_target AND public.has_branch_access(s.branch_id)
    );
  END IF;

  RETURN false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.can_subscribe_topic(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_subscribe_topic(text) TO authenticated;

-- Enable RLS on realtime.messages and add topic-prefix policy
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "topic_prefix_authz_select" ON realtime.messages;
DROP POLICY IF EXISTS "topic_prefix_authz_insert" ON realtime.messages;

CREATE POLICY "topic_prefix_authz_select"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.can_subscribe_topic(realtime.topic()));

CREATE POLICY "topic_prefix_authz_insert"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (public.can_subscribe_topic(realtime.topic()));

-- =========================================================
-- 2. password_history lockdown
-- =========================================================

-- Drop existing policies
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='password_history'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.password_history', p.policyname);
  END LOOP;
END $$;

ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.password_history FROM anon, authenticated;

-- RPC: check whether a candidate hash matches recent history
CREATE OR REPLACE FUNCTION public.check_password_history(p_email text, p_new_hash text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller text := lower(coalesce(auth.email(), ''));
  v_target text := lower(coalesce(p_email, ''));
BEGIN
  IF v_target = '' OR p_new_hash IS NULL THEN
    RETURN false;
  END IF;

  -- Only the owner or a superadmin can check a given email's history
  IF v_caller <> v_target AND NOT public.is_superadmin(v_caller) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM (
      SELECT password_hash
      FROM public.password_history
      WHERE email = v_target
      ORDER BY created_at DESC
      LIMIT 5
    ) recent
    WHERE recent.password_hash = p_new_hash
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_password_history(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_password_history(text, text) TO authenticated;

-- RPC: append a new password to history (owner or superadmin)
CREATE OR REPLACE FUNCTION public.add_password_to_history(p_email text, p_hash text, p_salt text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller text := lower(coalesce(auth.email(), ''));
  v_target text := lower(coalesce(p_email, ''));
BEGIN
  IF v_target = '' OR p_hash IS NULL OR p_salt IS NULL THEN
    RAISE EXCEPTION 'Invalid arguments';
  END IF;

  IF v_caller <> v_target AND NOT public.is_superadmin(v_caller) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  INSERT INTO public.password_history (email, password_hash, salt)
  VALUES (v_target, p_hash, p_salt);

  -- Keep only last 5 entries per email
  DELETE FROM public.password_history
  WHERE email = v_target
    AND id NOT IN (
      SELECT id FROM public.password_history
      WHERE email = v_target
      ORDER BY created_at DESC
      LIMIT 5
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_password_to_history(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_password_to_history(text, text, text) TO authenticated;
