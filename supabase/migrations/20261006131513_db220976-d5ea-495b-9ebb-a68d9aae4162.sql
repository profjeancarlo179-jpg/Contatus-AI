CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  segment text,
  profile_description text,
  logo_path text,
  brand_arts text[] NOT NULL DEFAULT '{}',
  brand_colors text,
  brand_fonts text,
  resp_name text,
  resp_role text,
  resp_email text,
  resp_phone text,
  resp_document text,
  socials jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage clients" ON public.clients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master'));