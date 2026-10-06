REVOKE INSERT, UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, agency_name, avatar_url) ON public.profiles TO authenticated;
DROP POLICY IF EXISTS "own profile insert" ON public.profiles;

DELETE FROM public.user_roles WHERE role = 'user';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_master boolean := lower(NEW.email) IN ('jean179@gmail.com', 'profjeancarlo179@gmail.com');
BEGIN
  INSERT INTO public.profiles (id, full_name, agency_name, email, approved)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'agency_name', NEW.email, is_master);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, CASE WHEN is_master THEN 'master'::app_role ELSE 'client'::app_role END);
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- existing users: backfill
UPDATE public.user_roles SET role = 'master' WHERE role = 'admin' AND user_id IN (SELECT id FROM public.profiles);

CREATE OR REPLACE FUNCTION public.my_access()
RETURNS TABLE (role text, approved boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT r.role::text FROM public.user_roles r WHERE r.user_id = auth.uid()
     ORDER BY CASE r.role WHEN 'master' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END LIMIT 1), 'client'),
         coalesce((SELECT p.approved FROM public.profiles p WHERE p.id = auth.uid()), false)
$$;
REVOKE EXECUTE ON FUNCTION public.my_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_access() TO authenticated;

CREATE OR REPLACE FUNCTION public.list_users()
RETURNS TABLE (id uuid, email text, full_name text, agency_name text, approved boolean, role text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'master') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT p.id, p.email, p.full_name, p.agency_name, p.approved,
    coalesce((SELECT r.role::text FROM public.user_roles r WHERE r.user_id = p.id
      ORDER BY CASE r.role WHEN 'master' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END LIMIT 1), 'client'),
    p.created_at
  FROM public.profiles p ORDER BY p.approved, p.created_at DESC;
END $$;
REVOKE EXECUTE ON FUNCTION public.list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_users() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_user_access(_user uuid, _approved boolean, _role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'master') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _role NOT IN ('client','admin','master') THEN RAISE EXCEPTION 'invalid role'; END IF;
  IF _user = auth.uid() AND (_role <> 'master' OR NOT _approved) THEN RAISE EXCEPTION 'cannot demote yourself'; END IF;
  UPDATE public.profiles SET approved = _approved WHERE id = _user;
  DELETE FROM public.user_roles WHERE user_id = _user;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user, _role::app_role);
END $$;
REVOKE EXECUTE ON FUNCTION public.set_user_access(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_access(uuid, boolean, text) TO authenticated;