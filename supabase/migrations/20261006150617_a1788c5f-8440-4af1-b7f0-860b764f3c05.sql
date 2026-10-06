CREATE TABLE public.role_tab_access (
  role text PRIMARY KEY CHECK (role IN ('master','admin','client','user')),
  tabs text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.role_tab_access TO authenticated;
GRANT ALL ON public.role_tab_access TO service_role;
ALTER TABLE public.role_tab_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signed in read role tabs" ON public.role_tab_access FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.set_role_tabs(_role text, _tabs text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'master') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _role NOT IN ('admin','client','user') THEN RAISE EXCEPTION 'invalid role'; END IF;
  IF _tabs IS NULL THEN DELETE FROM public.role_tab_access WHERE role = _role; RETURN; END IF;
  INSERT INTO public.role_tab_access (role, tabs, updated_at) VALUES (_role, _tabs, now())
  ON CONFLICT (role) DO UPDATE SET tabs = EXCLUDED.tabs, updated_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.set_user_access(_user uuid, _approved boolean, _role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'master') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _role NOT IN ('client','admin','master','user') THEN RAISE EXCEPTION 'invalid role'; END IF;
  IF _user = auth.uid() AND (_role <> 'master' OR NOT _approved) THEN RAISE EXCEPTION 'cannot demote yourself'; END IF;
  UPDATE public.profiles SET approved = _approved WHERE id = _user;
  DELETE FROM public.user_roles WHERE user_id = _user;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user, _role::app_role);
END $$;

CREATE OR REPLACE FUNCTION public.my_access()
RETURNS TABLE(role text, approved boolean, paused boolean) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce((SELECT r.role::text FROM public.user_roles r WHERE r.user_id = auth.uid()
     ORDER BY CASE r.role WHEN 'master' THEN 0 WHEN 'admin' THEN 1 WHEN 'client' THEN 2 ELSE 3 END LIMIT 1), 'client'),
         coalesce((SELECT p.approved AND NOT p.paused FROM public.profiles p WHERE p.id = auth.uid()), false),
         coalesce((SELECT p.paused FROM public.profiles p WHERE p.id = auth.uid()), false)
$$;