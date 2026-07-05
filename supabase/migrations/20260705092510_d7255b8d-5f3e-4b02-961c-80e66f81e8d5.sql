
CREATE TABLE public.authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  bio text NOT NULL DEFAULT '',
  avatar_url text,
  website_url text,
  twitter_url text,
  instagram_url text,
  facebook_url text,
  youtube_url text,
  linkedin_url text,
  tiktok_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.authors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.authors TO authenticated;
GRANT ALL ON public.authors TO service_role;

ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read authors" ON public.authors
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can insert authors" ON public.authors
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update authors" ON public.authors
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete authors" ON public.authors
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER authors_set_updated_at
  BEFORE UPDATE ON public.authors
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.articles
  ADD COLUMN author_id uuid REFERENCES public.authors(id) ON DELETE SET NULL;

ALTER TABLE public.recipes
  ADD COLUMN author_id uuid REFERENCES public.authors(id) ON DELETE SET NULL;

CREATE INDEX articles_author_id_idx ON public.articles(author_id);
CREATE INDEX recipes_author_id_idx ON public.recipes(author_id);
