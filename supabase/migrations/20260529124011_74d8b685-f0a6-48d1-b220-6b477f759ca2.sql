
CREATE TABLE public.dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL,
  location text NOT NULL,
  price_range text NOT NULL,
  scheduled_date date,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dates TO anon, authenticated;
GRANT ALL ON public.dates TO service_role;

ALTER TABLE public.dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dates public read" ON public.dates FOR SELECT USING (true);
CREATE POLICY "dates public insert" ON public.dates FOR INSERT WITH CHECK (true);
CREATE POLICY "dates public update" ON public.dates FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "dates public delete" ON public.dates FOR DELETE USING (true);

CREATE TRIGGER dates_set_updated_at
BEFORE UPDATE ON public.dates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.date_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.date_categories TO anon, authenticated;
GRANT ALL ON public.date_categories TO service_role;

ALTER TABLE public.date_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "date_categories public read" ON public.date_categories FOR SELECT USING (true);
CREATE POLICY "date_categories public insert" ON public.date_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "date_categories public update" ON public.date_categories FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "date_categories public delete" ON public.date_categories FOR DELETE USING (true);

INSERT INTO public.date_categories (name) VALUES ('Romântico'), ('Diversão'), ('Novo restaurante');
