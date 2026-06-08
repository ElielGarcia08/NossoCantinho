CREATE TABLE public.mood_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person text NOT NULL CHECK (person IN ('vitoria','eliel')),
  mood text NOT NULL,
  message text,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (person, entry_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mood_entries TO anon, authenticated;
GRANT ALL ON public.mood_entries TO service_role;

ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mood public read" ON public.mood_entries FOR SELECT USING (true);
CREATE POLICY "mood public insert" ON public.mood_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "mood public update" ON public.mood_entries FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "mood public delete" ON public.mood_entries FOR DELETE USING (true);

CREATE TRIGGER mood_entries_set_updated_at
BEFORE UPDATE ON public.mood_entries
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();