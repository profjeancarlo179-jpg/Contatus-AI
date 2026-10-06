ALTER TABLE public.bio_pages ADD COLUMN appearance jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(appearance) = 'object' AND octet_length(appearance::text) <= 4096);
GRANT SELECT (appearance) ON public.bio_pages TO anon;
DROP FUNCTION public.get_bio_page(text);
CREATE FUNCTION public.get_bio_page(_slug text) RETURNS TABLE (name text, description text, photo text, links jsonb, appearance jsonb) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$ SELECT name, description, photo, links, appearance FROM public.bio_pages WHERE slug = _slug AND published = true LIMIT 1 $$;
REVOKE ALL ON FUNCTION public.get_bio_page(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_bio_page(text) TO anon, authenticated;