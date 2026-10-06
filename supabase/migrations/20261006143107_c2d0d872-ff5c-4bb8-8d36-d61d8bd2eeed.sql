ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS paused boolean NOT NULL DEFAULT false;

DROP FUNCTION IF EXISTS public.my_access();
CREATE FUNCTION public.my_access()
 RETURNS TABLE(role text, approved boolean, paused boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT coalesce((SELECT r.role::text FROM public.user_roles r WHERE r.user_id = auth.uid()
     ORDER BY CASE r.role WHEN 'master' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END LIMIT 1), 'client'),
         coalesce((SELECT p.approved AND NOT p.paused FROM public.profiles p WHERE p.id = auth.uid()), false),
         coalesce((SELECT p.paused FROM public.profiles p WHERE p.id = auth.uid()), false)
$$;

DROP FUNCTION IF EXISTS public.list_users();
CREATE FUNCTION public.list_users()
 RETURNS TABLE(id uuid, email text, full_name text, agency_name text, approved boolean, role text, created_at timestamptz, paused boolean)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'master') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT p.id, p.email, p.full_name, p.agency_name, p.approved,
    coalesce((SELECT r.role::text FROM public.user_roles r WHERE r.user_id = p.id
      ORDER BY CASE r.role WHEN 'master' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END LIMIT 1), 'client'),
    p.created_at, p.paused
  FROM public.profiles p ORDER BY p.approved, p.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.set_user_paused(_user uuid, _paused boolean)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'master') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _user = auth.uid() THEN RAISE EXCEPTION 'cannot demote yourself'; END IF;
  UPDATE public.profiles SET paused = _paused WHERE id = _user;
END $$;

CREATE OR REPLACE FUNCTION public.update_user_info(_user uuid, _full_name text, _agency_name text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'master') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles SET full_name = NULLIF(trim(left(_full_name,120)),''), agency_name = NULLIF(trim(left(_agency_name,120)),'') WHERE id = _user;
END $$;