CREATE OR REPLACE FUNCTION public.my_pending_contents()
RETURNS TABLE(share_token text, title text, client_name text, format text, sent_at timestamptz, expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.share_token, c.title, c.client_name, c.format, c.sent_at, c.expires_at
  FROM public.contents c
  WHERE c.status = 'pending'
    AND c.client_email IS NOT NULL
    AND lower(trim(c.client_email)) = lower(auth.jwt() ->> 'email')
  ORDER BY c.sent_at DESC NULLS LAST
$$;
REVOKE ALL ON FUNCTION public.my_pending_contents() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_pending_contents() TO authenticated;