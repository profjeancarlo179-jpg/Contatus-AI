CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL DEFAULT auth.uid(),
  client_id uuid,
  client_name text NOT NULL,
  client_email text,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pendente',
  share_token text NOT NULL UNIQUE DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 10),
  signed_name text,
  signed_document text,
  signature text,
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "master manage contracts" ON public.contracts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'master'::app_role)) WITH CHECK (has_role(auth.uid(), 'master'::app_role));

CREATE OR REPLACE FUNCTION public.get_contract(_token text)
RETURNS TABLE(title text, body text, client_name text, status text, signed_name text, signed_document text, signature text, signed_at timestamptz, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT title, body, client_name, status, signed_name, signed_document, signature, signed_at, created_at
  FROM public.contracts WHERE share_token = _token AND status <> 'cancelado'
$$;

CREATE OR REPLACE FUNCTION public.sign_contract(_token text, _name text, _document text, _signature text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF length(coalesce(trim(_name),'')) < 3 OR length(coalesce(_signature,'')) < 50 OR length(_signature) > 500000 OR _signature NOT LIKE 'data:image/png;base64,%' THEN
    RAISE EXCEPTION 'Dados de assinatura inválidos';
  END IF;
  UPDATE public.contracts SET status='assinado', signed_name=left(trim(_name),200), signed_document=left(trim(coalesce(_document,'')),40),
    signature=_signature, signed_at=now(), updated_at=now()
  WHERE share_token=_token AND status='pendente';
  IF NOT FOUND THEN RAISE EXCEPTION 'Contrato indisponível ou já assinado'; END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.get_contract(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sign_contract(text, text, text, text) TO anon, authenticated;