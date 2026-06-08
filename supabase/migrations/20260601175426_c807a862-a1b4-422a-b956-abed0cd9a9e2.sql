CREATE TABLE public.letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  remetente text NOT NULL CHECK (remetente IN ('Eliel','Vitória')),
  destinatario text NOT NULL CHECK (destinatario IN ('Eliel','Vitória')),
  titulo text NOT NULL,
  mensagem text NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'não lida' CHECK (status IN ('lida','não lida')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.letters TO anon, authenticated;
GRANT ALL ON public.letters TO service_role;

ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "letters public read" ON public.letters FOR SELECT USING (true);
CREATE POLICY "letters public insert" ON public.letters FOR INSERT WITH CHECK (true);
CREATE POLICY "letters public update" ON public.letters FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "letters public delete" ON public.letters FOR DELETE USING (true);

CREATE TRIGGER letters_set_updated_at
BEFORE UPDATE ON public.letters
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();