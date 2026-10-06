CREATE OR REPLACE FUNCTION public.my_decided_contents()
RETURNS TABLE(id uuid, share_token text, title text, client_name text, format text, image_urls text[], status text, decided_at timestamptz, auto_approved boolean, rejection_reasons text[], feedback text, caption text, hashtags text, audio text, location text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT c.id, c.share_token, c.title, c.client_name, c.format, c.image_urls, c.status, c.decided_at, c.auto_approved, c.rejection_reasons, c.feedback, c.caption, c.hashtags, c.audio, c.location
  FROM public.contents c
  WHERE c.status IN ('approved','rejected')
    AND (
      (c.client_email IS NOT NULL AND lower(trim(c.client_email)) = lower(auth.jwt() ->> 'email'))
      OR EXISTS (SELECT 1 FROM public.clients cl
        WHERE lower(trim(cl.name)) = lower(trim(coalesce(c.client_name,'')))
          AND (cl.user_id = auth.uid() OR auth.uid() = ANY(cl.user_ids)))
    )
  ORDER BY c.decided_at DESC NULLS LAST
$$;
REVOKE EXECUTE ON FUNCTION public.my_decided_contents() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.my_decided_contents() TO authenticated;

CREATE OR REPLACE FUNCTION public.request_repost(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE c public.contents;
BEGIN
  SELECT * INTO c FROM public.contents WHERE id = _id;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Arte não encontrada'; END IF;
  IF NOT (c.user_id = auth.uid()
    OR (c.client_email IS NOT NULL AND lower(trim(c.client_email)) = lower(auth.jwt() ->> 'email'))
    OR EXISTS (SELECT 1 FROM public.clients cl WHERE lower(trim(cl.name)) = lower(trim(coalesce(c.client_name,'')))
        AND (cl.user_id = auth.uid() OR auth.uid() = ANY(cl.user_ids)))) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  INSERT INTO public.contents(user_id, title, kind, format, caption, hashtags, image_urls, audio, location, client_name, client_email, status, decided_at, sent_at)
  VALUES (c.user_id, c.title || ' (postar novamente)', c.kind, c.format, c.caption, c.hashtags, c.image_urls, c.audio, c.location, c.client_name, c.client_email, 'approved', now(), now());
END $$;
REVOKE EXECUTE ON FUNCTION public.request_repost(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.request_repost(uuid) TO authenticated;