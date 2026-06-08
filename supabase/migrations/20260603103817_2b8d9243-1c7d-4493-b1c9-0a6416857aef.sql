
CREATE TABLE public.wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  link_url text,
  description text,
  category text NOT NULL DEFAULT 'Outros',
  price numeric,
  image_url text,
  store text,
  priority text,
  delivered boolean NOT NULL DEFAULT false,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlist_items TO anon, authenticated;
GRANT ALL ON public.wishlist_items TO service_role;

ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wishlist public read" ON public.wishlist_items FOR SELECT USING (true);
CREATE POLICY "wishlist public insert" ON public.wishlist_items FOR INSERT WITH CHECK (true);
CREATE POLICY "wishlist public update" ON public.wishlist_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "wishlist public delete" ON public.wishlist_items FOR DELETE USING (true);

CREATE TRIGGER wishlist_items_set_updated_at
BEFORE UPDATE ON public.wishlist_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
