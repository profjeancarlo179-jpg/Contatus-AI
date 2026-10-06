ALTER FUNCTION public.get_bio_page(text) SECURITY INVOKER;
GRANT SELECT (name, description, photo, links, slug, published) ON public.bio_pages TO anon;
CREATE POLICY "Visitors read published bio pages" ON public.bio_pages FOR SELECT TO anon USING (published = true);
CREATE POLICY "Signed in visitors read published bio pages" ON public.bio_pages FOR SELECT TO authenticated USING (published = true);