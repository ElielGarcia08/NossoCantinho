CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  challenged text NOT NULL,
  period text NOT NULL,
  difficulty text NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  completion_photo_url text,
  completed_at timestamptz,
  saved_to_moments boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges TO anon, authenticated;
GRANT ALL ON public.challenges TO service_role;

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "challenges public read" ON public.challenges FOR SELECT USING (true);
CREATE POLICY "challenges public insert" ON public.challenges FOR INSERT WITH CHECK (true);
CREATE POLICY "challenges public update" ON public.challenges FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "challenges public delete" ON public.challenges FOR DELETE USING (true);

CREATE TRIGGER challenges_set_updated_at BEFORE UPDATE ON public.challenges
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();