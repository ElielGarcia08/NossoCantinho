import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useServerFn } from "@tanstack/react-start";
import { Plus, X, Loader2, Search, Check, ExternalLink, Sparkles, Gift, Trash2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { scrapeProductUrl, sendWishlistNotification } from "@/lib/wishlist.functions";
import { requireAuth } from "@/lib/auth-route";

type WishItem = {
  id: string;
  title: string;
  link_url: string | null;
  description: string | null;
  category: string;
  price: number | null;
  image_url: string | null;
  store: string | null;
  priority: string | null;
  delivered: boolean;
  delivered_at: string | null;
  created_at: string;
};

const sb = supabase.from("wishlist_items" as never) as any;

const DEFAULT_CATEGORIES = ["Maquiagem", "Perfumes", "Livros", "Roupas", "Acessórios", "Outros"];

const PRICE_RANGES = [
  { label: "Todos", min: null as number | null, max: null as number | null },
  { label: "Até R$50", min: 0, max: 50 },
  { label: "R$50 - R$100", min: 50, max: 100 },
  { label: "R$100 - R$200", min: 100, max: 200 },
  { label: "Acima de R$200", min: 200, max: null },
];

const fmtBRL = (n?: number | null) =>
  typeof n === "number" ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : null;

/* ───────────────────── Add Item Modal ───────────────────── */
function AddItemModal({
  onClose,
  onSaved,
  categories,
}: {
  onClose: () => void;
  onSaved: () => void;
  categories: string[];
}) {
  const [linkUrl, setLinkUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Outros");
  const [newCategory, setNewCategory] = useState("");
  const [price, setPrice] = useState<string>("");
  const [imageUrl, setImageUrl] = useState("");
  const [store, setStore] = useState("");
  const [priority, setPriority] = useState("");
  const [saving, setSaving] = useState(false);
  const [scrapeState, setScrapeState] = useState<"idle" | "loading" | "ok" | "fail">("idle");

  const scrape = useServerFn(scrapeProductUrl);
  const notify = useServerFn(sendWishlistNotification);

  const handleUrlBlur = async () => {
    const url = linkUrl.trim();
    if (!url || scrapeState === "loading") return;
    try {
      new URL(url);
    } catch {
      return;
    }
    setScrapeState("loading");
    try {
      const r = await scrape({ data: { url } });
      if (r.ok) {
        let filled = false;
        if (r.title && !title) {
          setTitle(r.title);
          filled = true;
        }
        if (r.description && !description) {
          setDescription(r.description);
          filled = true;
        }
        if (r.image && !imageUrl) {
          setImageUrl(r.image);
          filled = true;
        }
        if (r.store && !store) {
          setStore(r.store);
          filled = true;
        }
        if (typeof r.price === "number" && !price) {
          setPrice(String(r.price));
          filled = true;
        }
        setScrapeState(filled ? "ok" : "fail");
      } else {
        setScrapeState("fail");
      }
    } catch {
      setScrapeState("fail");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    const finalCategory = (newCategory.trim() || category).slice(0, 120);
    const priceNum = price.trim() ? parseFloat(price.replace(",", ".")) : null;
    const payload = {
      title: title.trim(),
      link_url: linkUrl.trim() || null,
      description: description.trim() || null,
      category: finalCategory || "Outros",
      price: priceNum != null && !isNaN(priceNum) ? priceNum : null,
      image_url: imageUrl.trim() || null,
      store: store.trim() || null,
      priority: priority.trim() || null,
    };
    const { error } = await sb.insert(payload);
    if (error) {
      alert("Erro ao salvar: " + error.message);
      setSaving(false);
      return;
    }
    // Fire-and-forget email
    notify({
      data: {
        title: payload.title,
        link_url: payload.link_url || "",
        description: payload.description || "",
        category: payload.category,
        price: payload.price ?? undefined,
        store: payload.store || "",
      },
    }).catch((err) => console.warn("Wishlist email failed:", err));
    onSaved();
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] grid place-items-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl bg-[color:var(--ink)]/95 border border-[color:var(--rose-antique)]/25 p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_-20px_oklch(0.10_0.05_18/0.95)] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="text-[10px] uppercase tracking-[0.35em] text-[color:var(--rose-antique)]">Novo desejo</p>
        <h3 className="font-display text-2xl mt-1 text-gradient-rose">Adicionar item</h3>

        <form onSubmit={submit} className="mt-5 space-y-3 text-sm">
          <div>
            <label className="text-xs text-[color:var(--cream)]/70">Link de compra</label>
            <div className="relative">
              <input
                value={linkUrl}
                onChange={(e) => {
                  setLinkUrl(e.target.value);
                  setScrapeState("idle");
                }}
                onBlur={handleUrlBlur}
                placeholder="https://..."
                maxLength={2000}
                className="mt-1 w-full rounded-xl bg-black/30 border border-[color:var(--rose-antique)]/20 px-3 py-2 text-[color:var(--cream)] outline-none focus:border-[color:var(--rose-antique)]/60"
              />
            </div>
            {scrapeState === "loading" && (
              <p className="mt-1 text-[11px] text-[color:var(--cream)]/60 inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Buscando informações...
              </p>
            )}
            {scrapeState === "ok" && (
              <p className="mt-1 text-[11px] text-[color:var(--rose-antique)] inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Informações preenchidas
              </p>
            )}
            {scrapeState === "fail" && (
              <p className="mt-1 text-[11px] text-[color:var(--cream)]/60">
                Não consegui preencher automaticamente, complete manualmente.
              </p>
            )}
          </div>

          <div>
            <label className="text-xs text-[color:var(--cream)]/70">Título *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={300}
              className="mt-1 w-full rounded-xl bg-black/30 border border-[color:var(--rose-antique)]/20 px-3 py-2 text-[color:var(--cream)] outline-none focus:border-[color:var(--rose-antique)]/60"
            />
          </div>

          <div>
            <label className="text-xs text-[color:var(--cream)]/70">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              className="mt-1 w-full rounded-xl bg-black/30 border border-[color:var(--rose-antique)]/20 px-3 py-2 text-[color:var(--cream)] outline-none focus:border-[color:var(--rose-antique)]/60 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[color:var(--cream)]/70">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-xl bg-black/30 border border-[color:var(--rose-antique)]/20 px-3 py-2 text-[color:var(--cream)] outline-none focus:border-[color:var(--rose-antique)]/60"
              >
                {categories.map((c) => (
                  <option key={c} value={c} className="bg-[color:var(--ink)]">
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[color:var(--cream)]/70">Preço (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0,00"
                className="mt-1 w-full rounded-xl bg-black/30 border border-[color:var(--rose-antique)]/20 px-3 py-2 text-[color:var(--cream)] outline-none focus:border-[color:var(--rose-antique)]/60"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-[color:var(--cream)]/70">Nova categoria (opcional)</label>
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Ex.: Casa, Joias..."
              maxLength={120}
              className="mt-1 w-full rounded-xl bg-black/30 border border-[color:var(--rose-antique)]/20 px-3 py-2 text-[color:var(--cream)] outline-none focus:border-[color:var(--rose-antique)]/60"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[color:var(--cream)]/70">Imagem (URL)</label>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1 w-full rounded-xl bg-black/30 border border-[color:var(--rose-antique)]/20 px-3 py-2 text-[color:var(--cream)] outline-none focus:border-[color:var(--rose-antique)]/60"
              />
            </div>
            <div>
              <label className="text-xs text-[color:var(--cream)]/70">Loja</label>
              <input
                value={store}
                onChange={(e) => setStore(e.target.value)}
                placeholder="Ex.: Sephora"
                className="mt-1 w-full rounded-xl bg-black/30 border border-[color:var(--rose-antique)]/20 px-3 py-2 text-[color:var(--cream)] outline-none focus:border-[color:var(--rose-antique)]/60"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-[color:var(--cream)]/70">Prioridade (opcional)</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="mt-1 w-full rounded-xl bg-black/30 border border-[color:var(--rose-antique)]/20 px-3 py-2 text-[color:var(--cream)] outline-none focus:border-[color:var(--rose-antique)]/60"
            >
              <option value="" className="bg-[color:var(--ink)]">
                —
              </option>
              <option value="alta" className="bg-[color:var(--ink)]">
                Alta
              </option>
              <option value="média" className="bg-[color:var(--ink)]">
                Média
              </option>
              <option value="baixa" className="bg-[color:var(--ink)]">
                Baixa
              </option>
            </select>
          </div>

          <div className="flex gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-full glass hover:bg-[color:var(--burnt)]/20 text-[color:var(--cream)] transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-br from-[color:var(--burnt)] to-[color:var(--wine)] text-[color:var(--cream)] glow-wine hover:scale-[1.02] transition disabled:opacity-50 disabled:hover:scale-100"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

/* ───────────────────── Card ───────────────────── */
function ItemCard({
  item,
  onMarkDelivered,
  onDelete,
}: {
  item: WishItem;
  onMarkDelivered?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <div className="glass rounded-3xl overflow-hidden flex flex-col group hover:scale-[1.01] transition-transform relative">
      {item.image_url ? (
        <div className="relative h-48 overflow-hidden bg-black/30">
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
          {item.delivered && (
            <div className="absolute inset-0 bg-black/40 grid place-items-center">
              <span className="px-3 py-1.5 rounded-full bg-[color:var(--rose-antique)]/90 text-[color:var(--ink)] text-xs font-medium inline-flex items-center gap-1">
                <Check className="h-3 w-3" /> Entregue
              </span>
            </div>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(item.id)}
              aria-label="Excluir item"
              className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-[color:var(--cream)]/80 hover:bg-[color:var(--burnt)]/80 hover:text-[color:var(--cream)] transition opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="relative h-32 grid place-items-center bg-gradient-to-br from-[color:var(--wine)]/40 to-[color:var(--burnt)]/30">
          <Gift className="h-10 w-10 text-[color:var(--rose-antique)]/60" />
          {onDelete && (
            <button
              onClick={() => onDelete(item.id)}
              aria-label="Excluir item"
              className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-[color:var(--cream)]/80 hover:bg-[color:var(--burnt)]/80 hover:text-[color:var(--cream)] transition opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--rose-antique)]">
            {item.category}
          </span>
          {item.priority && (
            <span className="text-[10px] uppercase tracking-wider text-[color:var(--cream)]/60">{item.priority}</span>
          )}
        </div>
        <h3 className="font-display text-xl mt-2 text-[color:var(--cream)] line-clamp-2">{item.title}</h3>
        {item.description && (
          <p className="text-sm text-[color:var(--cream)]/60 mt-2 line-clamp-3">{item.description}</p>
        )}

        <div className="mt-3 flex items-center justify-between text-xs text-[color:var(--cream)]/70">
          {item.store && <span className="truncate max-w-[60%]">{item.store}</span>}
          {item.price != null && <span className="font-medium text-[color:var(--cream)]">{fmtBRL(item.price)}</span>}
        </div>

        {item.delivered && item.delivered_at && (
          <p className="mt-3 text-[11px] text-[color:var(--rose-antique)] inline-flex items-center gap-1">
            <Check className="h-3 w-3" /> Entregue em {new Date(item.delivered_at).toLocaleDateString("pt-BR")}
          </p>
        )}

        <div className="mt-4 flex items-center gap-2 pt-3 border-t border-[color:var(--cream)]/10">
          {item.link_url && (
            <a
              href={item.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full glass hover:bg-[color:var(--burnt)]/20 text-xs text-[color:var(--cream)] transition"
            >
              <ExternalLink className="h-3 w-3" /> Ver produto
            </a>
          )}
          {!item.delivered && onMarkDelivered && (
            <button
              onClick={() => onMarkDelivered(item.id)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-gradient-to-br from-[color:var(--burnt)] to-[color:var(--wine)] text-[color:var(--cream)] text-xs glow-wine hover:scale-[1.02] transition"
            >
              <Check className="h-3 w-3" /> Marcar como entregue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────── Delete Confirm Modal ───────────────────── */
function DeleteConfirmModal({
  item,
  onClose,
  onConfirm,
}: {
  item: WishItem;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    await onConfirm();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] grid place-items-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl bg-[color:var(--ink)]/95 border border-[color:var(--rose-antique)]/25 p-6 sm:p-8 shadow-[0_20px_60px_-20px_oklch(0.10_0.05_18/0.95)] animate-in zoom-in-95 duration-200 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
        <Trash2 className="h-10 w-10 mx-auto text-[color:var(--rose-antique)]/80" />
        <h3 className="font-display text-xl mt-4 text-[color:var(--cream)]">Excluir item</h3>
        <p className="mt-2 text-sm text-[color:var(--cream)]/70">
          Tem certeza que deseja remover <strong className="text-[color:var(--cream)]">{item.title}</strong> da
          Wishlist?
        </p>
        <p className="mt-1 text-xs text-[color:var(--cream)]/50">Essa ação não pode ser desfeita.</p>
        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-full glass hover:bg-[color:var(--burnt)]/20 text-[color:var(--cream)] transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-br from-[color:var(--burnt)] to-[color:var(--wine)] text-[color:var(--cream)] glow-wine hover:scale-[1.02] transition disabled:opacity-50 disabled:hover:scale-100"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Excluir
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ───────────────────── Page ───────────────────── */
function WishlistPage() {
  const [items, setItems] = useState<WishItem[]>([]);
  const [tab, setTab] = useState<"desejados" | "entregues">("desejados");
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [priceRangeIdx, setPriceRangeIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await sb.select("*").order("created_at", { ascending: false });
    if (!error && data) setItems(data as WishItem[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    items.forEach((i) => i.category && set.add(i.category));
    return Array.from(set);
  }, [items]);

  const markDelivered = async (id: string) => {
    const { error } = await sb.update({ delivered: true, delivered_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      alert("Erro: " + error.message);
      return;
    }
    load();
  };

  const deleteItem = async (id: string) => {
    const { error } = await sb.delete().eq("id", id);
    if (error) {
      alert("Erro ao excluir: " + error.message);
      return;
    }
    setDeleteConfirmId(null);
    load();
  };

  const filtered = useMemo(() => {
    const range = PRICE_RANGES[priceRangeIdx];
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (tab === "desejados" && i.delivered) return false;
      if (tab === "entregues" && !i.delivered) return false;
      if (categoryFilter !== "Todas" && i.category !== categoryFilter) return false;
      if (range.min != null && (i.price == null || i.price < range.min)) return false;
      if (range.max != null && (i.price == null || i.price > range.max)) return false;
      if (q) {
        const hay = [i.title, i.description, i.category, i.store].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, tab, query, categoryFilter, priceRangeIdx]);

  return (
    <PageShell
      eyebrow="Capítulo final"
      title="Wishlist"
      subtitle="Para que eu possa dar presentes ao meu maior presente."
    >
      {/* Tabs + Add */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="inline-flex rounded-full glass p-1 border border-[color:var(--rose-antique)]/20">
          {(["desejados", "entregues"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-full text-sm capitalize transition ${
                tab === t
                  ? "bg-gradient-to-br from-[color:var(--burnt)] to-[color:var(--wine)] text-[color:var(--cream)] glow-wine"
                  : "text-[color:var(--cream)]/70 hover:text-[color:var(--cream)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-br from-[color:var(--burnt)] to-[color:var(--wine)] text-[color:var(--cream)] text-sm glow-wine hover:scale-[1.02] transition"
        >
          <Plus className="h-4 w-4" /> Adicionar item
        </button>
      </div>

      {/* Filters */}
      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        <div className="relative sm:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--cream)]/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar..."
            className="w-full pl-9 pr-3 py-2.5 rounded-full glass border border-[color:var(--rose-antique)]/20 text-sm text-[color:var(--cream)] outline-none focus:border-[color:var(--rose-antique)]/60"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2.5 rounded-full glass border border-[color:var(--rose-antique)]/20 text-sm text-[color:var(--cream)] outline-none focus:border-[color:var(--rose-antique)]/60"
        >
          <option value="Todas" className="bg-[color:var(--ink)]">
            Todas as categorias
          </option>
          {categories.map((c) => (
            <option key={c} value={c} className="bg-[color:var(--ink)]">
              {c}
            </option>
          ))}
        </select>
        <select
          value={priceRangeIdx}
          onChange={(e) => setPriceRangeIdx(Number(e.target.value))}
          className="px-4 py-2.5 rounded-full glass border border-[color:var(--rose-antique)]/20 text-sm text-[color:var(--cream)] outline-none focus:border-[color:var(--rose-antique)]/60"
        >
          {PRICE_RANGES.map((r, i) => (
            <option key={r.label} value={i} className="bg-[color:var(--ink)]">
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid place-items-center py-20 text-[color:var(--cream)]/50">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 glass rounded-3xl">
          <Gift className="h-10 w-10 mx-auto text-[color:var(--rose-antique)]/60" />
          <p className="mt-4 text-[color:var(--cream)]/70">
            {tab === "desejados"
              ? "Sua wishlist está vazia. Adicione o primeiro desejo ✨"
              : "Nenhum presente entregue ainda."}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onMarkDelivered={tab === "desejados" ? markDelivered : undefined}
              onDelete={setDeleteConfirmId}
            />
          ))}
        </div>
      )}

      {showAdd && <AddItemModal onClose={() => setShowAdd(false)} onSaved={load} categories={categories} />}

      {deleteConfirmId && (
        <DeleteConfirmModal
          item={items.find((i) => i.id === deleteConfirmId)!}
          onClose={() => setDeleteConfirmId(null)}
          onConfirm={() => deleteItem(deleteConfirmId)}
        />
      )}
    </PageShell>
  );
}

export const Route = createFileRoute("/wishlist")({
  beforeLoad: requireAuth,
  component: WishlistPage,
});
