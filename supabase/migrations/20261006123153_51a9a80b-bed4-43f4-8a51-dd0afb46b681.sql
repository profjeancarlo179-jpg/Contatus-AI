ALTER TABLE public.contents
  ADD COLUMN format text NOT NULL DEFAULT 'feed',
  ADD COLUMN audio text,
  ADD COLUMN location text,
  ADD COLUMN client_email text,
  ADD COLUMN sent_at timestamptz,
  ADD COLUMN expires_at timestamptz,
  ADD COLUMN rejection_reasons text[] NOT NULL DEFAULT '{}',
  ADD COLUMN decided_at timestamptz,
  ADD COLUMN auto_approved boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.auto_approve_expired()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.contents SET status = 'approved', auto_approved = true, decided_at = expires_at, updated_at = now()
  WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < now();
$$;
GRANT EXECUTE ON FUNCTION public.auto_approve_expired() TO anon, authenticated;

DROP FUNCTION public.get_shared_content(text);
CREATE FUNCTION public.get_shared_content(_token text)
RETURNS TABLE (id uuid, title text, kind text, format text, caption text, hashtags text, image_urls text[], audio text, location text, client_name text, status text, expires_at timestamptz, auto_approved boolean, agency_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.auto_approve_expired();
  RETURN QUERY SELECT c.id, c.title, c.kind, c.format, c.caption, c.hashtags, c.image_urls, c.audio, c.location, c.client_name, c.status, c.expires_at, c.auto_approved, p.agency_name
  FROM public.contents c LEFT JOIN public.profiles p ON p.id = c.user_id
  WHERE c.share_token = _token;
END $$;
GRANT EXECUTE ON FUNCTION public.get_shared_content(text) TO anon, authenticated;

DROP FUNCTION public.submit_approval(text, boolean, boolean, text);
CREATE FUNCTION public.submit_decision(_token text, _approved boolean, _reasons text[], _feedback text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF length(coalesce(_feedback,'')) > 2000 THEN RAISE EXCEPTION 'feedback too long'; END IF;
  IF coalesce(array_length(_reasons,1),0) > 10 THEN RAISE EXCEPTION 'too many reasons'; END IF;
  UPDATE public.contents SET
    status = CASE WHEN _approved THEN 'approved' ELSE 'rejected' END,
    rejection_reasons = CASE WHEN _approved THEN '{}' ELSE coalesce(_reasons,'{}') END,
    feedback = CASE WHEN _approved THEN NULL ELSE NULLIF(trim(_feedback), '') END,
    decided_at = now(), updated_at = now()
  WHERE share_token = _token AND status = 'pending';
END $$;
GRANT EXECUTE ON FUNCTION public.submit_decision(text, boolean, text[], text) TO anon, authenticated;