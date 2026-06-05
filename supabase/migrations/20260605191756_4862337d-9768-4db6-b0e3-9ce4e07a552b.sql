CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  tag text NOT NULL DEFAULT '',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  image_url text,
  published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.recipes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published recipes"
  ON public.recipes FOR SELECT
  TO anon, authenticated
  USING (published = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage recipes"
  ON public.recipes FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER recipes_set_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();