CREATE OR REPLACE FUNCTION public.get_shared_instagram(_token text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT nullif(trim(cl.socials->>'instagram'), '')
  FROM public.contents c
  JOIN public.clients cl ON lower(trim(cl.name)) = lower(trim(c.client_name))
  WHERE c.share_token = _token
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.get_shared_instagram(text) TO anon, authenticated;