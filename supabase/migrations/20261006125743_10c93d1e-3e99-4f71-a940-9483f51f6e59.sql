CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL DEFAULT auth.uid(),
  client_id uuid NOT NULL,
  title text NOT NULL,
  period text,
  network text NOT NULL DEFAULT 'Instagram',
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  released boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage reports" ON public.reports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master'));
CREATE POLICY "client reads released" ON public.reports FOR SELECT TO authenticated
  USING (client_id = auth.uid() AND released);

CREATE OR REPLACE FUNCTION public.list_clients()
RETURNS TABLE (id uuid, email text, full_name text, agency_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master')) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT p.id, p.email, p.full_name, p.agency_name FROM public.profiles p
  JOIN public.user_roles r ON r.user_id = p.id AND r.role = 'client'
  WHERE p.approved ORDER BY p.full_name NULLS LAST, p.email;
END $$;
REVOKE EXECUTE ON FUNCTION public.list_clients() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_clients() TO authenticated;