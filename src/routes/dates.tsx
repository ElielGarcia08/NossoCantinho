import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus, X, Heart, Calendar as CalendarIcon, MapPin, Tag, DollarSign,
  Shuffle, RotateCcw, Check, Trash2, Loader2, ChevronLeft, ChevronRight, Sparkles,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import datesBg from "@/assets/dates-bg-custom.png";
import { requireAuth } from "@/lib/auth-route";

type Date_ = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  location: string;
  price_range: string;
  scheduled_date: string | null;
  completed: boolean;
};

type Category = { id: string; name: string };

const PRICE_RANGES = ["Até R$50", "R$50 a R$150", "R$150 a R$300", "Acima de R$300"];


function fmtDate(iso: string | null) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export const Route = createFileRoute("/dates")({
  beforeLoad: requireAuth,
  component: DatesPage,
});

function DatesPage() {
  const [dates, setDates] = useState<Date_[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Date_ | null>(null);
  const [view, setView] = useState<"cards" | "calendar">("cards");
  const [randomizer, setRandomizer] = useState<null | "pending" | "completed">(null);
  const [completing, setCompleting] = useState<Date_ | null>(null);

  useEffect(() => {
    (async () => {
      const [d, c] = await Promise.all([
        supabase.from("dates").select("*").order("created_at", { ascending: false }),
        supabase.from("date_categories").select("*").order("name", { ascending: true }),
      ]);
      setDates(((d as { data: Date_[] | null }).data) ?? []);
      setCategories(((c as { data: Category[] | null }).data) ?? []);
      setLoading(false);
    })();
  }, []);

  const upsert = async (d: {
    id?: string; title: string; category: string; location: string; price_range: string;
    description?: string | null; scheduled_date?: string | null; completed?: boolean;
  }) => {
    const payload = {
      title: d.title, description: d.description ?? null, category: d.category,
      location: d.location, price_range: d.price_range,
      scheduled_date: d.scheduled_date || null, completed: d.completed ?? false,
    };
    if (d.id) {
      const { data } = await supabase.from("dates").update(payload).eq("id", d.id).select().single();
      if (data) setDates((p) => p.map((x) => (x.id === d.id ? (data as Date_) : x)));
    } else {
      const { data } = await supabase.from("dates").insert(payload).select().single();
      if (data) setDates((p) => [data as Date_, ...p]);
    }
  };

  const remove = async (id: string) => {
    await supabase.from("dates").delete().eq("id", id);
    setDates((p) => p.filter((x) => x.id !== id));
  };

  const addCategory = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) return;
    const { data } = await supabase.from("date_categories").insert({ name: trimmed }).select().single();
    if (data) setCategories((p) => [...p, data as Category].sort((a, b) => a.name.localeCompare(b.name)));
  };


  return (
    <>
      <div aria-hidden className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[color:var(--ink)]">
        <img src={datesBg} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover blur-3xl opacity-80" />
        <img src={datesBg} alt="" className="absolute inset-0 h-full w-full object-contain" />
      </div>
      <div aria-hidden className="fixed inset-0 z-0 pointer-events-none" style={{ background: "rgba(0,0,0,0.32)" }} />
    <PageShell
      eyebrow="Capítulo 03"
      title="Ideias de Date"
      subtitle="Pra gente nunca ficar sem desculpa pra criar memórias juntos."
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-1.5 glass rounded-full p-1">
          <button onClick={() => setView("cards")}
            className={`px-3.5 py-1.5 rounded-full text-xs tracking-wide transition-all ${view === "cards" ? "bg-gradient-to-r from-[color:var(--burnt)] to-[color:var(--wine)] text-[color:var(--cream)]" : "text-[color:var(--cream)]/60 hover:text-[color:var(--cream)]"}`}>
            Cards
          </button>
          <button onClick={() => setView("calendar")}
            className={`px-3.5 py-1.5 rounded-full text-xs tracking-wide transition-all ${view === "calendar" ? "bg-gradient-to-r from-[color:var(--burnt)] to-[color:var(--wine)] text-[color:var(--cream)]" : "text-[color:var(--cream)]/60 hover:text-[color:var(--cream)]"}`}>
            Calendário
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setRandomizer("pending")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-[color:var(--rose-antique)]/30 text-[color:var(--cream)] text-sm hover:scale-[1.03] transition">
            <Shuffle className="h-3.5 w-3.5" /> Sortear Date <Heart className="h-3 w-3 fill-current text-[color:var(--rose-antique)]" />
          </button>
          <button onClick={() => setRandomizer("completed")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-[color:var(--rose-antique)]/30 text-[color:var(--cream)] text-sm hover:scale-[1.03] transition">
            <RotateCcw className="h-3.5 w-3.5" /> Recriar Date <Heart className="h-3 w-3 fill-current text-[color:var(--rose-antique)]" />
          </button>
          <button onClick={() => setCreating(true)}
            className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[color:var(--burnt)] to-[color:var(--wine)] text-[color:var(--cream)] shadow-[0_10px_30px_-10px_oklch(0.35_0.10_18/0.7)] hover:scale-[1.03] transition-all">
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
            <span className="text-sm font-medium tracking-wide">Adicionar Date</span>
            <Heart className="h-3.5 w-3.5 fill-current text-[color:var(--rose-antique)]" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[color:var(--cream)]/50">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : view === "cards" ? (
        <DateGrid dates={dates} onEdit={setEditing} onComplete={setCompleting} />
      ) : (
        <CalendarView dates={dates} onSelect={setEditing} />
      )}

      {(creating || editing) && (
        <DateModal
          initial={editing}
          categories={categories}
          onAddCategory={addCategory}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSave={async (d) => { await upsert(d); setCreating(false); setEditing(null); }}
          onDelete={editing ? async () => { await remove(editing.id); setEditing(null); } : undefined}
        />
      )}

      {randomizer && (
        <RandomizerModal
          mode={randomizer}
          dates={dates.filter((d) => (randomizer === "pending" ? !d.completed : d.completed))}
          categories={categories}
          onClose={() => setRandomizer(null)}
        />
      )}

      {completing && (
        <CompleteModal
          date={completing}
          onClose={() => setCompleting(null)}
          onConfirm={async (toMoments) => {
            await upsert({ ...completing, completed: true });
            if (toMoments) {
              const url = new URL("/momentos", window.location.origin);
              url.searchParams.set("title", completing.title);
              if (completing.scheduled_date) url.searchParams.set("date", completing.scheduled_date);
              window.location.href = url.toString();
            }
            setCompleting(null);
          }}
        />
      )}
    </PageShell>
    </>
  );
}

function DateGrid({ dates, onEdit, onComplete }: {
  dates: Date_[]; onEdit: (d: Date_) => void; onComplete: (d: Date_) => void;
}) {
  if (dates.length === 0) {
    return (
      <div className="text-center py-20 text-[color:var(--cream)]/50">
        <Sparkles className="h-6 w-6 mx-auto mb-3 text-[color:var(--rose-antique)]" />
        <p className="text-sm">Nenhum date ainda. Cria o primeiro ❤️</p>
      </div>
    );
  }
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {dates.map((d) => <DateCard key={d.id} date={d} onEdit={() => onEdit(d)} onComplete={() => onComplete(d)} />)}
    </div>
  );
}

function DateCard({ date, onEdit, onComplete }: {
  date: Date_; onEdit: () => void; onComplete: () => void;
}) {
  return (
    <div className="group glass rounded-3xl p-6 hover:-translate-y-1 transition relative overflow-hidden border border-[color:var(--rose-antique)]/15">
      <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--burnt)]/5 to-transparent pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--rose-antique)]">{date.category}</span>
          <span className={`text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full ${date.completed ? "bg-[color:var(--rose-antique)]/20 text-[color:var(--rose-antique)]" : "bg-[color:var(--burnt)]/20 text-[color:var(--cream)]/70"}`}>
            {date.completed ? "Concluído ❤️" : "Pendente ❤️"}
          </span>
        </div>
        <h3 className="font-display text-2xl text-[color:var(--cream)] leading-tight mb-3">{date.title}</h3>
        <div className="space-y-1.5 text-sm text-[color:var(--cream)]/70">
          <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-[color:var(--rose-antique)]" /> {date.location}</p>
          <p className="flex items-center gap-2"><DollarSign className="h-3.5 w-3.5 text-[color:var(--rose-antique)]" /> {date.price_range}</p>
          {date.scheduled_date && <p className="flex items-center gap-2"><CalendarIcon className="h-3.5 w-3.5 text-[color:var(--rose-antique)]" /> {fmtDate(date.scheduled_date)}</p>}
        </div>
        {date.description && (
          <p className="mt-3 text-sm text-[color:var(--cream)]/60 italic line-clamp-3">"{date.description}"</p>
        )}
        <div className="mt-4 flex items-center gap-2">
          {!date.completed && (
            <button onClick={onComplete}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-[color:var(--burnt)]/20 hover:bg-[color:var(--burnt)]/40 text-[color:var(--cream)] text-xs transition">
              <Check className="h-3.5 w-3.5" /> Concluir
            </button>
          )}
          <button onClick={onEdit}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full glass border border-white/10 hover:border-[color:var(--rose-antique)]/40 text-[color:var(--cream)]/80 text-xs transition">
            Editar
          </button>
        </div>
      </div>
    </div>
  );
}

function CalendarView({ dates, onSelect }: { dates: Date_[]; onSelect: (d: Date_) => void }) {
  const [cursor, setCursor] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const monthName = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const firstDay = cursor.getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const datesByDay = useMemo(() => {
    const m = new Map<string, Date_[]>();
    dates.forEach((d) => { if (d.scheduled_date) { const arr = m.get(d.scheduled_date) ?? []; arr.push(d); m.set(d.scheduled_date, arr); } });
    return m;
  }, [dates]);

  const cells: Array<{ day: number | null; iso: string | null }> = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: null, iso: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, iso });
  }

  return (
    <div className="glass rounded-3xl p-5 sm:p-7 border border-[color:var(--rose-antique)]/15">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="p-2 rounded-full hover:bg-white/5 text-[color:var(--cream)]/70"><ChevronLeft className="h-4 w-4" /></button>
        <h3 className="font-display text-xl text-[color:var(--cream)] capitalize">{monthName}</h3>
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="p-2 rounded-full hover:bg-white/5 text-[color:var(--cream)]/70"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-[color:var(--rose-antique)] mb-2">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          const events = c.iso ? datesByDay.get(c.iso) ?? [] : [];
          return (
            <div key={i} className={`aspect-square rounded-xl p-1.5 text-xs ${c.day ? "bg-white/5" : ""} ${events.length > 0 ? "ring-1 ring-[color:var(--rose-antique)]/40" : ""}`}>
              {c.day && (
                <div className="h-full flex flex-col">
                  <span className="text-[color:var(--cream)]/60">{c.day}</span>
                  <div className="flex-1 overflow-hidden space-y-0.5 mt-0.5">
                    {events.slice(0, 2).map((e) => (
                      <button key={e.id} onClick={() => onSelect(e)}
                        className="block w-full text-[9px] truncate text-left px-1 py-0.5 rounded bg-[color:var(--burnt)]/40 hover:bg-[color:var(--burnt)]/70 text-[color:var(--cream)] transition">
                        {e.title}
                      </button>
                    ))}
                    {events.length > 2 && <span className="text-[9px] text-[color:var(--rose-antique)]">+{events.length - 2}</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DateModal({ initial, categories, onAddCategory, onClose, onSave, onDelete }: {
  initial: Date_ | null;
  categories: Category[];
  onAddCategory: (n: string) => Promise<void>;
  onClose: () => void;
  onSave: (d: { id?: string; title: string; category: string; location: string; price_range: string; description?: string | null; scheduled_date?: string | null; completed?: boolean }) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState(initial?.category ?? categories[0]?.name ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [priceRange, setPriceRange] = useState(initial?.price_range ?? PRICE_RANGES[0]);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [scheduledDate, setScheduledDate] = useState(initial?.scheduled_date ?? "");
  const [newCat, setNewCat] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const submit = async () => {
    if (!title.trim()) return setError("Coloca um título 💌");
    if (!category) return setError("Escolhe uma categoria ✨");
    if (!location.trim()) return setError("Coloca o local 📍");
    setSaving(true);
    try {
      await onSave({
        id: initial?.id, title: title.trim(), category, location: location.trim(),
        price_range: priceRange, description: description.trim() || null,
        scheduled_date: scheduledDate || null, completed: initial?.completed ?? false,
      });
    } catch (e) { setError("Erro ao salvar."); console.error(e); }
    finally { setSaving(false); }
  };

  const addCat = async () => { if (newCat.trim()) { await onAddCategory(newCat); setCategory(newCat.trim()); setNewCat(""); } };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="absolute inset-0 bg-[color:var(--ink)]/70 backdrop-blur-xl" />
      <div className="relative w-full sm:max-w-lg glass rounded-t-3xl sm:rounded-3xl border border-[color:var(--rose-antique)]/20 shadow-[0_30px_80px_-20px_oklch(0.10_0.05_18/0.9)] overflow-hidden animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--rose-antique)]">{initial ? "Editar date" : "Novo date"}</p>
            <h2 className="font-display text-xl text-[color:var(--cream)] mt-0.5">{initial ? "Refazendo o convite" : "Mais uma ideia pra nós"}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 text-[color:var(--cream)]/70"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <Field label="Título"><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Jantar a luz de vela..." className="w-full bg-transparent text-[color:var(--cream)] outline-none placeholder:text-[color:var(--cream)]/30" /></Field>

          <Field label="Categoria" icon={<Tag className="h-3.5 w-3.5" />}>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-transparent text-[color:var(--cream)] outline-none [color-scheme:dark]">
              {categories.map((c) => <option key={c.id} value={c.name} className="bg-[color:var(--ink)]">{c.name}</option>)}
            </select>
          </Field>
          <div className="flex gap-2">
            <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Nova categoria..." className="flex-1 px-3 py-2 rounded-xl bg-white/5 text-sm text-[color:var(--cream)] outline-none placeholder:text-[color:var(--cream)]/30" />
            <button onClick={addCat} className="px-3 py-2 rounded-xl bg-[color:var(--burnt)]/30 hover:bg-[color:var(--burnt)]/50 text-[color:var(--cream)] text-xs transition">Criar</button>
          </div>

          <Field label="Local" icon={<MapPin className="h-3.5 w-3.5" />}><input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120} placeholder="Onde será?" className="w-full bg-transparent text-[color:var(--cream)] outline-none placeholder:text-[color:var(--cream)]/30" /></Field>

          <Field label="Faixa de preço" icon={<DollarSign className="h-3.5 w-3.5" />}>
            <select value={priceRange} onChange={(e) => setPriceRange(e.target.value)} className="w-full bg-transparent text-[color:var(--cream)] outline-none [color-scheme:dark]">
              {PRICE_RANGES.map((p) => <option key={p} value={p} className="bg-[color:var(--ink)]">{p}</option>)}
            </select>
          </Field>

          <Field label="Data (opcional)" icon={<CalendarIcon className="h-3.5 w-3.5" />}>
            <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="w-full bg-transparent text-[color:var(--cream)] outline-none [color-scheme:dark]" />
          </Field>

          <Field label="Descrição (opcional)">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={400} rows={3} placeholder="Detalhes que tornam especial..." className="w-full bg-transparent text-[color:var(--cream)] outline-none resize-none placeholder:text-[color:var(--cream)]/30" />
          </Field>

          {error && <p className="text-xs text-[color:var(--rose-antique)]">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-white/5">
          {onDelete ? (
            <button onClick={onDelete} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs text-[color:var(--cream)]/60 hover:text-[color:var(--rose-antique)] transition">
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </button>
          ) : <div />}
          <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[color:var(--burnt)] to-[color:var(--wine)] text-[color:var(--cream)] text-sm hover:scale-[1.03] transition disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-3.5 w-3.5 fill-current" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function RandomizerModal({ mode, dates, categories, onClose }: {
  mode: "pending" | "completed"; dates: Date_[]; categories: Category[]; onClose: () => void;
}) {
  const [cats, setCats] = useState<string[]>([]);
  const [prices, setPrices] = useState<string[]>([]);
  const [locs, setLocs] = useState<string[]>([]);
  const [result, setResult] = useState<Date_ | null>(null);

  const allLocs = useMemo(() => Array.from(new Set(dates.map((d) => d.location))).sort(), [dates]);

  const filtered = dates.filter((d) =>
    (cats.length === 0 || cats.includes(d.category)) &&
    (prices.length === 0 || prices.includes(d.price_range)) &&
    (locs.length === 0 || locs.includes(d.location))
  );

  const toggle = (arr: string[], v: string, set: (a: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const draw = () => {
    if (filtered.length === 0) return;
    setResult(filtered[Math.floor(Math.random() * filtered.length)]);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="absolute inset-0 bg-[color:var(--ink)]/70 backdrop-blur-xl" />
      <div className="relative w-full sm:max-w-lg glass rounded-t-3xl sm:rounded-3xl border border-[color:var(--rose-antique)]/20 overflow-hidden animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--rose-antique)]">{mode === "pending" ? "Sortear" : "Recriar"}</p>
            <h2 className="font-display text-xl text-[color:var(--cream)] mt-0.5">{mode === "pending" ? "Que tal essa ideia?" : "Reviver um momento ❤️"}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 text-[color:var(--cream)]/70"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {result ? (
            <div className="animate-in fade-in zoom-in-95 duration-500 glass rounded-3xl p-6 text-center border border-[color:var(--rose-antique)]/30">
              <Sparkles className="h-6 w-6 mx-auto mb-3 text-[color:var(--rose-antique)] animate-shimmer" />
              <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--rose-antique)]">{result.category}</p>
              <h3 className="font-display text-3xl text-[color:var(--cream)] my-2">{result.title}</h3>
              <p className="text-sm text-[color:var(--cream)]/70">{result.location} · {result.price_range}</p>
              {result.description && <p className="mt-3 italic text-sm text-[color:var(--cream)]/60">"{result.description}"</p>}
              <button onClick={draw} className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-xs text-[color:var(--cream)]/80 hover:text-[color:var(--cream)] transition">
                <Shuffle className="h-3.5 w-3.5" /> Sortear outro
              </button>
            </div>
          ) : (
            <>
              <FilterChips label="Categorias" options={categories.map((c) => c.name)} selected={cats} onToggle={(v) => toggle(cats, v, setCats)} />
              <FilterChips label="Faixas de preço" options={PRICE_RANGES} selected={prices} onToggle={(v) => toggle(prices, v, setPrices)} />
              {allLocs.length > 0 && <FilterChips label="Locais" options={allLocs} selected={locs} onToggle={(v) => toggle(locs, v, setLocs)} />}
              <p className="text-xs text-[color:var(--cream)]/50">{filtered.length} {filtered.length === 1 ? "date" : "dates"} disponível{filtered.length === 1 ? "" : "is"}</p>
            </>
          )}
        </div>

        {!result && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/5">
            <button onClick={draw} disabled={filtered.length === 0} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[color:var(--burnt)] to-[color:var(--wine)] text-[color:var(--cream)] text-sm hover:scale-[1.03] transition disabled:opacity-50">
              {mode === "pending" ? <Shuffle className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
              {mode === "pending" ? "Sortear" : "Recriar"} <Heart className="h-3 w-3 fill-current" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChips({ label, options, selected, onToggle }: {
  label: string; options: string[]; selected: string[]; onToggle: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--rose-antique)] mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = selected.includes(o);
          return (
            <button key={o} onClick={() => onToggle(o)}
              className={`px-3 py-1.5 rounded-full text-xs transition ${active ? "bg-gradient-to-r from-[color:var(--burnt)] to-[color:var(--wine)] text-[color:var(--cream)]" : "glass border border-white/10 text-[color:var(--cream)]/70 hover:text-[color:var(--cream)]"}`}>
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CompleteModal({ date, onClose, onConfirm }: {
  date: Date_; onClose: () => void; onConfirm: (toMoments: boolean) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  const run = async (toMoments: boolean) => { setSaving(true); try { await onConfirm(toMoments); } finally { setSaving(false); } };
  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="absolute inset-0 bg-[color:var(--ink)]/70 backdrop-blur-xl" />
      <div className="relative w-full sm:max-w-md glass rounded-t-3xl sm:rounded-3xl border border-[color:var(--rose-antique)]/20 overflow-hidden animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 text-center">
          <Heart className="h-6 w-6 mx-auto mb-3 fill-current text-[color:var(--rose-antique)]" />
          <h2 className="font-display text-2xl text-[color:var(--cream)]">Date concluído ❤️</h2>
          <p className="text-sm text-[color:var(--cream)]/70 mt-2">"{date.title}"</p>
          <p className="text-sm text-[color:var(--cream)]/60 mt-4">Desejam registrar este momento em "Nossos Momentos"?</p>
          <div className="flex items-center justify-center gap-2 mt-5">
            <button onClick={() => run(false)} disabled={saving} className="px-5 py-2.5 rounded-full glass border border-white/10 text-[color:var(--cream)]/80 text-sm hover:text-[color:var(--cream)] transition disabled:opacity-50">
              Só concluir
            </button>
            <button onClick={() => run(true)} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[color:var(--burnt)] to-[color:var(--wine)] text-[color:var(--cream)] text-sm hover:scale-[1.03] transition disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-3.5 w-3.5 fill-current" />} Sim, registrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.3em] text-[color:var(--rose-antique)] mb-1.5">
        {icon} {label}
      </span>
      <div className="glass rounded-2xl px-4 py-3 border border-white/5 focus-within:border-[color:var(--rose-antique)]/40 transition">
        {children}
      </div>
    </label>
  );
}
