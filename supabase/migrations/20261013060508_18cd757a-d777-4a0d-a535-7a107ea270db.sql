CREATE OR REPLACE FUNCTION public.subscribe_public_chat_push(p_session_id uuid, p_student_id uuid, p_branch_id text, p_endpoint text, p_p256dh text, p_auth text, p_user_agent text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, p_branch_id) THEN
    RAISE EXCEPTION 'Invalid session';
  END IF;
  IF coalesce(p_endpoint,'') !~ '^https://' OR length(p_endpoint) > 2000 OR coalesce(p_p256dh,'') = '' OR coalesce(p_auth,'') = '' THEN
    RAISE EXCEPTION 'Invalid subscription';
  END IF;
  INSERT INTO student_notification_subscriptions(student_id, endpoint, p256dh, auth, user_agent)
  VALUES (p_student_id, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 500))
  ON CONFLICT (student_id, endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, user_agent = EXCLUDED.user_agent, updated_at = now();
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.unsubscribe_public_chat_push(p_session_id uuid, p_student_id uuid, p_branch_id text, p_endpoint text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, p_branch_id) THEN
    RAISE EXCEPTION 'Invalid session';
  END IF;
  DELETE FROM student_notification_subscriptions WHERE student_id = p_student_id AND endpoint = p_endpoint;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.public_chat_push_status(p_session_id uuid, p_student_id uuid, p_branch_id text, p_endpoint text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public._validate_public_chat_session(p_session_id, p_student_id, p_branch_id) THEN
    RETURN false;
  END IF;
  RETURN EXISTS (SELECT 1 FROM student_notification_subscriptions WHERE student_id = p_student_id AND endpoint = p_endpoint);
END $$;

REVOKE ALL ON FUNCTION public.subscribe_public_chat_push(uuid,uuid,text,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unsubscribe_public_chat_push(uuid,uuid,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_chat_push_status(uuid,uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.subscribe_public_chat_push(uuid,uuid,text,text,text,text,text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unsubscribe_public_chat_push(uuid,uuid,text,text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_chat_push_status(uuid,uuid,text,text) TO anon, authenticated, service_role;