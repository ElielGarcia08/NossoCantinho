CREATE TABLE public.movies_series (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('filme','serie')),
  genre TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','em_andamento','concluido')),
  seasons_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.movies_series TO anon, authenticated;
GRANT ALL ON public.movies_series TO service_role;

ALTER TABLE public.movies_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "movies_series public read" ON public.movies_series FOR SELECT USING (true);
CREATE POLICY "movies_series public insert" ON public.movies_series FOR INSERT WITH CHECK (true);
CREATE POLICY "movies_series public update" ON public.movies_series FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "movies_series public delete" ON public.movies_series FOR DELETE USING (true);

CREATE TRIGGER set_movies_series_updated_at
BEFORE UPDATE ON public.movies_series
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();