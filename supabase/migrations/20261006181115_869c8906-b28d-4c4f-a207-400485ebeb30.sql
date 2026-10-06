CREATE OR REPLACE FUNCTION public.is_client_member(_client uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.clients c WHERE c.id = _client AND (c.user_id = _user OR _user = ANY(c.user_ids)))
$$;
REVOKE EXECUTE ON FUNCTION public.is_client_member(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_client_member(uuid, uuid) TO authenticated;
CREATE POLICY "Linked client users read bio pages" ON public.bio_pages FOR SELECT TO authenticated
  USING (client_id IS NOT NULL AND public.is_client_member(client_id, auth.uid()));
CREATE POLICY "Linked client users update bio pages" ON public.bio_pages FOR UPDATE TO authenticated
  USING (client_id IS NOT NULL AND public.is_client_member(client_id, auth.uid()))
  WITH CHECK (client_id IS NOT NULL AND public.is_client_member(client_id, auth.uid()));