CREATE TABLE public.bio_pages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
 slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
 name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
 description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 500),
 photo text NOT NULL DEFAULT '' CHECK (char_length(photo) <= 700000 AND (photo = '' OR photo ~ '^data:image/(jpeg|png|webp);base64,')),
 links jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(links) = 'array' AND jsonb_array_length(links) <= 30),
 published boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bio_pages TO authenticated;
GRANT ALL ON public.bio_pages TO service_role;
ALTER TABLE public.bio_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage bio pages" ON public.bio_pages FOR ALL TO authenticated USING (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND approved)) WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND approved));
CREATE FUNCTION public.touch_bio_page() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER bio_page_updated BEFORE UPDATE ON public.bio_pages FOR EACH ROW EXECUTE FUNCTION public.touch_bio_page();
CREATE FUNCTION public.get_bio_page(_slug text) RETURNS TABLE (name text, description text, photo text, links jsonb) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT name, description, photo, links FROM public.bio_pages WHERE slug = _slug AND published = true LIMIT 1 $$;
REVOKE ALL ON FUNCTION public.get_bio_page(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_bio_page(text) TO anon, authenticated;