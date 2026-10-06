CREATE TABLE public.user_tab_access (
  user_id uuid PRIMARY KEY,
  tabs text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_tab_access TO authenticated;
GRANT ALL ON public.user_tab_access TO service_role;
ALTER TABLE public.user_tab_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or master read tabs" ON public.user_tab_access FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'master'));

CREATE OR REPLACE FUNCTION public.set_user_tabs(_user uuid, _tabs text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'master') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _tabs IS NULL THEN DELETE FROM public.user_tab_access WHERE user_id = _user; RETURN; END IF;
  INSERT INTO public.user_tab_access (user_id, tabs, updated_at) VALUES (_user, _tabs, now())
  ON CONFLICT (user_id) DO UPDATE SET tabs = EXCLUDED.tabs, updated_at = now();
END $$;
REVOKE ALL ON FUNCTION public.set_user_tabs(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_tabs(uuid, text[]) TO authenticated;