CREATE OR REPLACE FUNCTION public.my_pending_contents()
 RETURNS TABLE(share_token text, title text, client_name text, format text, sent_at timestamp with time zone, expires_at timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT c.share_token, c.title, c.client_name, c.format, c.sent_at, c.expires_at
  FROM public.contents c
  WHERE c.status = 'pending'
    AND (
      (c.client_email IS NOT NULL AND lower(trim(c.client_email)) = lower(auth.jwt() ->> 'email'))
      OR EXISTS (
        SELECT 1 FROM public.clients cl
        WHERE lower(trim(cl.name)) = lower(trim(coalesce(c.client_name,'')))
          AND (cl.user_id = auth.uid() OR auth.uid() = ANY(cl.user_ids))
      )
    )
  ORDER BY c.sent_at DESC NULLS LAST
$function$;