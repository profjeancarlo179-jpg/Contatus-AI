DROP POLICY IF EXISTS "signed in read role tabs" ON public.role_tab_access;
CREATE POLICY "read own role tabs" ON public.role_tab_access FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'master') OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role::text = role_tab_access.role));

DROP POLICY IF EXISTS "auth read payment settings" ON public.payment_settings;
CREATE POLICY "staff or invoiced clients read payment settings" ON public.payment_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'master') OR public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.invoices i WHERE i.client_id = auth.uid() AND i.released));

CREATE OR REPLACE FUNCTION public.media_path_shared(_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.contents c
    WHERE c.share_token IS NOT NULL AND (_name = ANY(c.image_urls) OR c.audio = _name))
$$;

DROP POLICY IF EXISTS "media read" ON storage.objects;
CREATE POLICY "media read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'media' AND (
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
    OR (auth.uid() IS NOT NULL AND (public.has_role(auth.uid(),'master') OR public.has_role(auth.uid(),'admin')))
    OR public.media_path_shared(name)
  ));