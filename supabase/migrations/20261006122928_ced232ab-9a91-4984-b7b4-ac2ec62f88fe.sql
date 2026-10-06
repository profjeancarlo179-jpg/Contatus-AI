CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  agency_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, agency_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'agency_name');
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL DEFAULT 'Sem título',
  kind text NOT NULL DEFAULT 'post',
  caption text NOT NULL DEFAULT '',
  hashtags text NOT NULL DEFAULT '',
  image_urls text[] NOT NULL DEFAULT '{}',
  batch_id uuid,
  batch_label text,
  day_number int,
  client_name text,
  status text NOT NULL DEFAULT 'draft',
  art_approved boolean,
  caption_approved boolean,
  feedback text,
  share_token text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', '') UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contents TO authenticated;
GRANT ALL ON public.contents TO service_role;
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own contents" ON public.contents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_shared_content(_token text)
RETURNS TABLE (id uuid, title text, kind text, caption text, hashtags text, image_urls text[], client_name text, status text, art_approved boolean, caption_approved boolean, feedback text, agency_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.title, c.kind, c.caption, c.hashtags, c.image_urls, c.client_name, c.status, c.art_approved, c.caption_approved, c.feedback, p.agency_name
  FROM public.contents c LEFT JOIN public.profiles p ON p.id = c.user_id
  WHERE c.share_token = _token
$$;

CREATE OR REPLACE FUNCTION public.submit_approval(_token text, _art boolean, _caption boolean, _feedback text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF length(coalesce(_feedback,'')) > 2000 THEN RAISE EXCEPTION 'feedback too long'; END IF;
  UPDATE public.contents SET
    art_approved = _art,
    caption_approved = _caption,
    feedback = NULLIF(trim(_feedback), ''),
    status = CASE WHEN _art AND _caption THEN 'approved' ELSE 'rejected' END,
    updated_at = now()
  WHERE share_token = _token;
END $$;
GRANT EXECUTE ON FUNCTION public.get_shared_content(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_approval(text, boolean, boolean, text) TO anon, authenticated;

CREATE TABLE public.audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  handle text NOT NULL,
  niche text,
  bio text,
  followers int,
  notes text,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audits TO authenticated;
GRANT ALL ON public.audits TO service_role;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own audits" ON public.audits FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "media read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'media');
CREATE POLICY "media user upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "media user delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);