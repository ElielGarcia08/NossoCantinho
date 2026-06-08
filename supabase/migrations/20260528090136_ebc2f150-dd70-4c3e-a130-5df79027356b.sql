
-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ===== moments =====
CREATE TABLE public.moments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  date date NOT NULL,
  image_url text NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.moments TO anon, authenticated;
GRANT ALL ON public.moments TO service_role;

ALTER TABLE public.moments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "moments public read" ON public.moments FOR SELECT USING (true);
CREATE POLICY "moments public insert" ON public.moments FOR INSERT WITH CHECK (true);
CREATE POLICY "moments public update" ON public.moments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "moments public delete" ON public.moments FOR DELETE USING (true);

CREATE TRIGGER moments_updated_at BEFORE UPDATE ON public.moments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== books =====
CREATE TABLE public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text NOT NULL,
  month text NOT NULL,
  cover_url text,
  participants text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.books TO anon, authenticated;
GRANT ALL ON public.books TO service_role;

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "books public read" ON public.books FOR SELECT USING (true);
CREATE POLICY "books public insert" ON public.books FOR INSERT WITH CHECK (true);
CREATE POLICY "books public update" ON public.books FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "books public delete" ON public.books FOR DELETE USING (true);

CREATE TRIGGER books_updated_at BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== book_reviews =====
CREATE TABLE public.book_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  person text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  rating numeric(2,1),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (book_id, person)
);

CREATE INDEX idx_book_reviews_book_id ON public.book_reviews(book_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_reviews TO anon, authenticated;
GRANT ALL ON public.book_reviews TO service_role;

ALTER TABLE public.book_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews public read" ON public.book_reviews FOR SELECT USING (true);
CREATE POLICY "reviews public insert" ON public.book_reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "reviews public update" ON public.book_reviews FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "reviews public delete" ON public.book_reviews FOR DELETE USING (true);

CREATE TRIGGER book_reviews_updated_at BEFORE UPDATE ON public.book_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Storage buckets =====
INSERT INTO storage.buckets (id, name, public) VALUES ('moments-images', 'moments-images', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('book-covers', 'book-covers', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "moments-images public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'moments-images');
CREATE POLICY "moments-images public insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'moments-images');
CREATE POLICY "moments-images public update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'moments-images');
CREATE POLICY "moments-images public delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'moments-images');

CREATE POLICY "book-covers public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'book-covers');
CREATE POLICY "book-covers public insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'book-covers');
CREATE POLICY "book-covers public update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'book-covers');
CREATE POLICY "book-covers public delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'book-covers');
