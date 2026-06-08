import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import libraryBg from "@/assets/library-bg.png";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, ChevronLeft, ChevronRight, Heart, Pencil, Plus, Search, Trash2, X, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureUploaded } from "@/lib/storage-upload";
import { requireAuth } from "@/lib/auth-route";

type PersonData = { completed: boolean; rating?: number; comment?: string };
type Book = {
  id: string;
  title: string;
  author: string;
  month: string; // "YYYY-MM"
  reader: "eliel" | "vitoria" | "both";
  cover?: string;
  eliel: PersonData;
  vitoria: PersonData;
};

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const formatMonth = (key: string) => {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
};
const shiftMonth = (key: string, delta: number) => {
  const [y, m] = key.split("-").map((n) => parseInt(n, 10));
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d);
};

const readerFromParticipants = (p: string[] | null): Book["reader"] => {
  const arr = (p ?? []).map((s) => s.toLowerCase());
  const e = arr.includes("eliel");
  const v = arr.includes("vitoria");
  if (e && v) return "both";
  if (v) return "vitoria";
  return "eliel";
};
const participantsFromReader = (r: Book["reader"]): string[] =>
  r === "both" ? ["eliel", "vitoria"] : [r];

const emptyPerson: PersonData = { completed: false };

/* ───────────────── Cover Auto-Fetch (Google Books + Open Library) ───────────────── */
const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

function scoreMatch(title: string, author: string, candTitle: string, candAuthors: string[]) {
  const t = normalize(title), a = normalize(author);
  const ct = normalize(candTitle);
  const ca = candAuthors.map(normalize).join(" ");
  let score = 0;
  if (ct === t) score += 5;
  else if (ct.includes(t) || t.includes(ct)) score += 3;
  if (ca.includes(a) || (a && a.split(" ").every((w) => w.length < 3 || ca.includes(w)))) score += 4;
  return score;
}

export async function fetchBookCover(title: string, author: string): Promise<string | undefined> {
  const t = title.trim(), a = author.trim();
  if (!t) return undefined;
  // 1) Google Books
  try {
    const q = encodeURIComponent(`intitle:${t}${a ? `+inauthor:${a}` : ""}`);
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=10`);
    if (res.ok) {
      const json = await res.json();
      const items: any[] = json.items ?? [];
      const ranked = items
        .map((it) => {
          const info = it.volumeInfo ?? {};
          const url: string | undefined =
            info.imageLinks?.extraLarge ||
            info.imageLinks?.large ||
            info.imageLinks?.medium ||
            info.imageLinks?.thumbnail ||
            info.imageLinks?.smallThumbnail;
          if (!url) return null;
          return {
            url: url.replace(/^http:/, "https:").replace(/&edge=curl/g, ""),
            score: scoreMatch(t, a, info.title ?? "", info.authors ?? []),
          };
        })
        .filter(Boolean) as { url: string; score: number }[];
      ranked.sort((x, y) => y.score - x.score);
      if (ranked[0] && ranked[0].score >= 3) return ranked[0].url;
    }
  } catch { /* ignore */ }
  // 2) Open Library fallback
  try {
    const params = new URLSearchParams({ title: t, limit: "10" });
    if (a) params.set("author", a);
    const res = await fetch(`https://openlibrary.org/search.json?${params.toString()}`);
    if (res.ok) {
      const json = await res.json();
      const docs: any[] = json.docs ?? [];
      const ranked = docs
        .map((d) => {
          if (!d.cover_i) return null;
          return {
            url: `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`,
            score: scoreMatch(t, a, d.title ?? "", d.author_name ?? []),
          };
        })
        .filter(Boolean) as { url: string; score: number }[];
      ranked.sort((x, y) => y.score - x.score);
      if (ranked[0] && ranked[0].score >= 3) return ranked[0].url;
    }
  } catch { /* ignore */ }
  return undefined;
}

function CoverAutoFetchButton({
  title,
  author,
  onFound,
  label = "Buscar capa automaticamente",
}: {
  title: string;
  author: string;
  onFound: (url: string) => void;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<null | "ok" | "none">(null);
  const disabled = busy || !title.trim() || !author.trim();
  return (
    <div className="mt-2 flex items-center gap-2 flex-wrap">
      <button
        type="button"
        disabled={disabled}
        onClick={async () => {
          setBusy(true); setStatus(null);
          const url = await fetchBookCover(title, author);
          setBusy(false);
          if (url) { onFound(url); setStatus("ok"); }
          else setStatus("none");
        }}
        className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-[color:var(--ink)]/50 border border-[color:var(--cream)]/15 text-[color:var(--cream)]/80 hover:text-[color:var(--cream)] hover:border-[color:var(--rose-antique)]/50 transition disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
        {busy ? "Buscando..." : label}
      </button>
      {status === "ok" && <span className="text-[11px] text-[color:var(--rose-antique)]">Capa encontrada ✨</span>}
      {status === "none" && <span className="text-[11px] text-[color:var(--cream)]/50">Sem resultado confiável</span>}
    </div>
  );
}

/* ───────────────── Star Rating (decimal, hover preview) ───────────────── */
function StarRating({
  value,
  onChange,
  size = 20,
}: {
  value?: number;
  onChange?: (v: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value ?? 0;
  const interactive = !!onChange;

  const handleMove = (e: React.MouseEvent | React.TouchEvent, i: number) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clientX =
      "touches" in e ? e.touches[0]?.clientX ?? rect.left : (e as React.MouseEvent).clientX;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const raw = i + ratio;
    const rounded = Math.round(raw * 10) / 10;
    setHover(Math.min(5, Math.max(0.1, rounded)));
  };

  return (
    <div
      className="inline-flex items-center gap-2 select-none"
      onMouseLeave={() => setHover(null)}
    >
      <div className="flex">
        {[0, 1, 2, 3, 4].map((i) => {
          const fill = Math.min(1, Math.max(0, display - i)) * 100;
          return (
            <button
              type="button"
              key={i}
              disabled={!interactive}
              onMouseMove={interactive ? (e) => handleMove(e, i) : undefined}
              onTouchMove={interactive ? (e) => handleMove(e, i) : undefined}
              onClick={interactive ? () => onChange?.(hover ?? i + 1) : undefined}
              className={`relative ${interactive ? "cursor-pointer" : ""} transition-transform duration-200 ${
                interactive ? "hover:scale-110" : ""
              }`}
              style={{ width: size, height: size }}
              aria-label={`${i + 1} estrelas`}
            >
              <svg viewBox="0 0 24 24" className="absolute inset-0 w-full h-full text-[color:var(--cream)]/20" fill="currentColor">
                <path d="M12 17.3l-6.16 3.7 1.64-7.03L2 9.24l7.19-.62L12 2l2.81 6.62L22 9.24l-5.48 4.73L18.16 21z" />
              </svg>
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${fill}%` }}>
                <svg
                  viewBox="0 0 24 24"
                  className="h-full text-[color:var(--rose-antique)] drop-shadow-[0_0_6px_oklch(0.68_0.09_20/0.6)]"
                  fill="currentColor"
                  style={{ width: size }}
                >
                  <path d="M12 17.3l-6.16 3.7 1.64-7.03L2 9.24l7.19-.62L12 2l2.81 6.62L22 9.24l-5.48 4.73L18.16 21z" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>
      <span className="text-xs text-[color:var(--cream)]/70 font-mono w-8">
        {display ? display.toFixed(1) : "—"}
      </span>
    </div>
  );
}

/* ───────────────── Person Section ───────────────── */
function PersonSection({
  name,
  data,
  onChange,
}: {
  name: string;
  data: PersonData;
  onChange: (next: PersonData) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.comment ?? "");

  useEffect(() => setDraft(data.comment ?? ""), [data.comment]);

  return (
    <div className="rounded-2xl border border-[color:var(--cream)]/10 bg-[color:var(--ink)]/30 p-4 backdrop-blur-md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Heart className="h-3.5 w-3.5 fill-[color:var(--burnt)] text-[color:var(--burnt)]" />
          <span className="font-display text-lg text-[color:var(--cream)]">{name}</span>
        </div>
        <label className="flex items-center gap-2 text-xs text-[color:var(--cream)]/70 cursor-pointer">
          <span
            className={`relative inline-flex h-5 w-5 items-center justify-center rounded-md border transition-all ${
              data.completed
                ? "bg-[color:var(--burnt)]/80 border-[color:var(--rose-antique)] shadow-[0_0_12px_oklch(0.55_0.18_25/0.5)]"
                : "border-[color:var(--cream)]/20 bg-transparent"
            }`}
          >
            {data.completed && <Check className="h-3.5 w-3.5 text-[color:var(--cream)]" />}
          </span>
          <input
            type="checkbox"
            className="sr-only"
            checked={data.completed}
            onChange={(e) => onChange({ ...data, completed: e.target.checked })}
          />
          {data.completed ? "Finalizado" : "Lendo"}
        </label>
      </div>

      <StarRating
        value={data.rating}
        onChange={(v) => onChange({ ...data, rating: v })}
      />

      <div className="mt-3">
        {editing ? (
          <div className="space-y-2 animate-fade-up">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder="Escreva um comentário..."
              className="w-full rounded-xl bg-[color:var(--ink)]/50 border border-[color:var(--cream)]/10 px-3 py-2 text-sm text-[color:var(--cream)] outline-none focus:border-[color:var(--rose-antique)]/50 transition"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setEditing(false); setDraft(data.comment ?? ""); }}
                className="text-xs px-3 py-1.5 rounded-full text-[color:var(--cream)]/60 hover:text-[color:var(--cream)]"
              >Cancelar</button>
              <button
                onClick={() => { onChange({ ...data, comment: draft.trim() || undefined }); setEditing(false); }}
                className="text-xs px-3 py-1.5 rounded-full bg-[color:var(--burnt)]/70 hover:bg-[color:var(--burnt)] text-[color:var(--cream)] transition"
              >Salvar</button>
            </div>
          </div>
        ) : data.comment ? (
          <div className="group relative rounded-xl bg-[color:var(--ink)]/40 px-3 py-2 text-sm text-[color:var(--cream)]/85 italic">
            "{data.comment}"
            <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition flex gap-1">
              <button onClick={() => setEditing(true)} className="p-1 rounded hover:bg-white/10" aria-label="Editar">
                <Pencil className="h-3 w-3" />
              </button>
              <button onClick={() => onChange({ ...data, comment: undefined })} className="p-1 rounded hover:bg-white/10" aria-label="Remover">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-[color:var(--rose-antique)] hover:text-[color:var(--cream)] transition"
          >+ adicionar comentário</button>
        )}
      </div>
    </div>
  );
}

/* ───────────────── Animated Counter ───────────────── */
function AnimatedCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = display;
    const diff = value - start;
    if (diff === 0) return;
    const duration = 900;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + diff * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{display}</>;
}

/* ───────────────── Stats Cards ───────────────── */
function StatsCards({ books }: { books: Book[] }) {
  const elielCount = books.filter((b) => (b.reader === "eliel" || b.reader === "both") && b.eliel.completed).length;
  const vitoriaCount = books.filter((b) => (b.reader === "vitoria" || b.reader === "both") && b.vitoria.completed).length;

  const Card = ({
    name,
    count,
    accent,
    glow,
    gradient,
  }: { name: string; count: number; accent: string; glow: string; gradient: string }) => (
    <div
      className="group relative overflow-hidden rounded-3xl border border-white/10 backdrop-blur-xl p-6 sm:p-7 transition-all duration-500 hover:-translate-y-1 animate-fade-up"
      style={{
        background: gradient,
        boxShadow: `0 20px 60px -20px ${glow}`,
      }}
    >
      <div
        className="absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl opacity-40 group-hover:opacity-60 transition-opacity duration-700"
        style={{ background: accent }}
      />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-[color:var(--cream)]/70">{name}</p>
          <p className="mt-2 font-display text-5xl sm:text-6xl text-[color:var(--cream)] drop-shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
            <AnimatedCounter value={count} />
          </p>
          <p className="mt-1 text-sm text-[color:var(--cream)]/75">
            {count === 1 ? "livro lido" : "livros lidos"}
          </p>
        </div>
        <div
          className="h-14 w-14 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/15 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"
          style={{ background: accent }}
        >
          <BookOpen className="h-6 w-6 text-[color:var(--cream)]" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-10">
      <Card
        name="Eliel"
        count={elielCount}
        accent="oklch(0.45 0.12 250 / 0.6)"
        glow="oklch(0.35 0.15 255 / 0.55)"
        gradient="linear-gradient(135deg, oklch(0.18 0.04 255 / 0.85), oklch(0.22 0.08 250 / 0.7))"
      />
      <Card
        name="Vitória"
        count={vitoriaCount}
        accent="oklch(0.55 0.18 25 / 0.6)"
        glow="oklch(0.40 0.15 20 / 0.55)"
        gradient="linear-gradient(135deg, oklch(0.20 0.06 18 / 0.85), oklch(0.28 0.10 25 / 0.7))"
      />
    </div>
  );
}

/* ───────────────── Edit Book Modal ───────────────── */
function EditBookModal({
  book,
  onClose,
  onSave,
}: {
  book: Book;
  onClose: () => void;
  onSave: (b: Book) => Promise<void> | void;
}) {
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [month, setMonth] = useState(book.month);
  const [reader, setReader] = useState<Book["reader"]>(book.reader);
  const [cover, setCover] = useState<string | undefined>(book.cover);
  const [saving, setSaving] = useState(false);

  const handleFile = (f?: File) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setCover(r.result as string);
    r.readAsDataURL(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) return;
    setSaving(true);
    try {
      await onSave({ ...book, title: title.trim(), author: author.trim(), month, reader, cover });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-up">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative glass rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-[0_40px_100px_-20px_oklch(0.10_0.05_18/0.9)]"
      >
        <button type="button" onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10" aria-label="Fechar">
          <X className="h-4 w-4" />
        </button>
        <h2 className="font-display text-3xl text-gradient-rose mb-1">Editar Livro</h2>
        <p className="text-sm text-[color:var(--cream)]/60 mb-6">Ajuste os detalhes do livro.</p>

        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--rose-antique)]">Título</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required
              className="mt-1 w-full rounded-xl bg-[color:var(--ink)]/50 border border-[color:var(--cream)]/10 px-3 py-2.5 text-[color:var(--cream)] outline-none focus:border-[color:var(--rose-antique)]/50 transition" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--rose-antique)]">Autor</label>
            <input value={author} onChange={(e) => setAuthor(e.target.value)} required
              className="mt-1 w-full rounded-xl bg-[color:var(--ink)]/50 border border-[color:var(--cream)]/10 px-3 py-2.5 text-[color:var(--cream)] outline-none focus:border-[color:var(--rose-antique)]/50 transition" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--rose-antique)]">Mês da leitura</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} required
              className="mt-1 w-full rounded-xl bg-[color:var(--ink)]/50 border border-[color:var(--cream)]/10 px-3 py-2.5 text-[color:var(--cream)] outline-none focus:border-[color:var(--rose-antique)]/50 transition" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--rose-antique)]">Quem vai ler</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {([
                { v: "eliel", l: "Eliel" },
                { v: "vitoria", l: "Vitória" },
                { v: "both", l: "Os dois" },
              ] as const).map((o) => (
                <button type="button" key={o.v} onClick={() => setReader(o.v)}
                  className={`rounded-full px-3 py-2 text-sm transition-all ${
                    reader === o.v
                      ? "bg-[color:var(--burnt)]/80 text-[color:var(--cream)] shadow-[0_0_20px_oklch(0.55_0.18_25/0.5)]"
                      : "bg-[color:var(--ink)]/40 text-[color:var(--cream)]/70 hover:text-[color:var(--cream)] border border-[color:var(--cream)]/10"
                  }`}>{o.l}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--rose-antique)]">Capa</label>
            <input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0])}
              className="mt-1 w-full text-sm text-[color:var(--cream)]/70 file:mr-3 file:rounded-full file:border-0 file:bg-[color:var(--burnt)]/70 file:px-4 file:py-2 file:text-[color:var(--cream)] hover:file:bg-[color:var(--burnt)]" />
            <CoverAutoFetchButton title={title} author={author} onFound={setCover} />
            {cover && (
              <div className="mt-3 flex items-center gap-3">
                <img src={cover} alt="preview" className="h-32 rounded-lg object-cover" />
                <button type="button" onClick={() => setCover(undefined)}
                  className="text-xs text-[color:var(--cream)]/60 hover:text-[color:var(--cream)]">Remover capa</button>
              </div>
            )}
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="mt-6 w-full rounded-full bg-gradient-to-r from-[color:var(--burnt)] to-[color:var(--wine)] py-3 font-display text-lg text-[color:var(--cream)] shadow-[0_10px_40px_-10px_oklch(0.55_0.18_25/0.7)] hover:shadow-[0_15px_50px_-10px_oklch(0.55_0.18_25/0.9)] transition-all disabled:opacity-60">
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>
    </div>,
    document.body
  );
}

/* ───────────────── Book Card ───────────────── */
function BookCard({
  book,
  onUpdate,
  onDelete,
}: {
  book: Book;
  onUpdate: (b: Book) => void;
  onDelete: () => void;
}) {
  const showEliel = book.reader === "eliel" || book.reader === "both";
  const showVitoria = book.reader === "vitoria" || book.reader === "both";
  const [editing, setEditing] = useState(false);

  return (
    <div className="group glass rounded-3xl p-5 sm:p-6 transition-all duration-500 hover:shadow-[0_30px_80px_-30px_oklch(0.55_0.18_25/0.55)] hover:-translate-y-1 animate-fade-up">
      <div className="flex gap-4">
        <div className="relative w-24 sm:w-28 aspect-[2/3] rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-[color:var(--wine)] to-[color:var(--burnt)] shadow-[0_10px_30px_-10px_oklch(0.10_0.05_18/0.8)]">
          {book.cover ? (
            <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-[color:var(--cream)]/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display text-xl sm:text-2xl text-gradient-rose truncate">{book.title}</h3>
              <p className="text-sm text-[color:var(--cream)]/70 truncate">{book.author}</p>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--rose-antique)] mt-2">
                {formatMonth(book.month)}
              </p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 rounded-full hover:bg-white/10"
                aria-label="Editar livro"
              >
                <Pencil className="h-4 w-4 text-[color:var(--cream)]/60" />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 rounded-full hover:bg-white/10"
                aria-label="Remover livro"
              >
                <Trash2 className="h-4 w-4 text-[color:var(--cream)]/60" />
              </button>
            </div>
          </div>
        </div>
      </div>
      {editing && (
        <EditBookModal book={book} onClose={() => setEditing(false)} onSave={onUpdate} />
      )}

      <div className={`mt-5 grid gap-3 ${showEliel && showVitoria ? "sm:grid-cols-2" : ""}`}>
        {showEliel && (
          <PersonSection name="Eliel" data={book.eliel} onChange={(d) => onUpdate({ ...book, eliel: d })} />
        )}
        {showVitoria && (
          <PersonSection name="Vitória" data={book.vitoria} onChange={(d) => onUpdate({ ...book, vitoria: d })} />
        )}
      </div>
    </div>
  );
}

/* ───────────────── Add Book Modal ───────────────── */
function AddBookModal({
  open,
  onClose,
  onAdd,
  defaultMonth,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (b: Omit<Book, "id">) => Promise<void> | void;
  defaultMonth: string;
}) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [month, setMonth] = useState(defaultMonth);
  const [reader, setReader] = useState<Book["reader"]>("both");
  const [cover, setCover] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const autoTried = useRef<string>("");

  useEffect(() => {
    if (open) {
      setTitle(""); setAuthor(""); setMonth(defaultMonth); setReader("both"); setCover(undefined);
      autoTried.current = "";
    }
  }, [open, defaultMonth]);

  // Auto-fetch cover when both title and author are filled and no cover yet
  useEffect(() => {
    if (!open) return;
    const t = title.trim(), a = author.trim();
    if (!t || !a || cover) return;
    const key = `${t.toLowerCase()}|${a.toLowerCase()}`;
    if (autoTried.current === key) return;
    const handle = setTimeout(async () => {
      autoTried.current = key;
      const url = await fetchBookCover(t, a);
      if (url) setCover((curr) => curr ?? url);
    }, 700);
    return () => clearTimeout(handle);
  }, [title, author, cover, open]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) return;
    setSaving(true);
    try {
      await onAdd({
        title: title.trim(),
        author: author.trim(),
        month,
        reader,
        cover,
        eliel: { completed: false },
        vitoria: { completed: false },
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleFile = (f?: File) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setCover(r.result as string);
    r.readAsDataURL(f);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-up">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative glass rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-[0_40px_100px_-20px_oklch(0.10_0.05_18/0.9)]"
      >
        <button type="button" onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10" aria-label="Fechar">
          <X className="h-4 w-4" />
        </button>
        <h2 className="font-display text-3xl text-gradient-rose mb-1">Novo Livro ❤️</h2>
        <p className="text-sm text-[color:var(--cream)]/60 mb-6">Mais uma história pro nosso clube.</p>

        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--rose-antique)]">Título</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required
              className="mt-1 w-full rounded-xl bg-[color:var(--ink)]/50 border border-[color:var(--cream)]/10 px-3 py-2.5 text-[color:var(--cream)] outline-none focus:border-[color:var(--rose-antique)]/50 transition" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--rose-antique)]">Autor</label>
            <input value={author} onChange={(e) => setAuthor(e.target.value)} required
              className="mt-1 w-full rounded-xl bg-[color:var(--ink)]/50 border border-[color:var(--cream)]/10 px-3 py-2.5 text-[color:var(--cream)] outline-none focus:border-[color:var(--rose-antique)]/50 transition" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--rose-antique)]">Mês da leitura</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} required
              className="mt-1 w-full rounded-xl bg-[color:var(--ink)]/50 border border-[color:var(--cream)]/10 px-3 py-2.5 text-[color:var(--cream)] outline-none focus:border-[color:var(--rose-antique)]/50 transition" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--rose-antique)]">Quem vai ler</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {([
                { v: "eliel", l: "Eliel" },
                { v: "vitoria", l: "Vitória" },
                { v: "both", l: "Os dois" },
              ] as const).map((o) => (
                <button type="button" key={o.v} onClick={() => setReader(o.v)}
                  className={`rounded-full px-3 py-2 text-sm transition-all ${
                    reader === o.v
                      ? "bg-[color:var(--burnt)]/80 text-[color:var(--cream)] shadow-[0_0_20px_oklch(0.55_0.18_25/0.5)]"
                      : "bg-[color:var(--ink)]/40 text-[color:var(--cream)]/70 hover:text-[color:var(--cream)] border border-[color:var(--cream)]/10"
                  }`}>{o.l}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--rose-antique)]">Capa (opcional)</label>
            <input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0])}
              className="mt-1 w-full text-sm text-[color:var(--cream)]/70 file:mr-3 file:rounded-full file:border-0 file:bg-[color:var(--burnt)]/70 file:px-4 file:py-2 file:text-[color:var(--cream)] hover:file:bg-[color:var(--burnt)]" />
            <CoverAutoFetchButton title={title} author={author} onFound={setCover} label="Buscar capa pelo título e autor" />
            {cover && (
              <div className="mt-3 flex items-center gap-3">
                <img src={cover} alt="preview" className="h-32 rounded-lg object-cover" />
                <button type="button" onClick={() => setCover(undefined)}
                  className="text-xs text-[color:var(--cream)]/60 hover:text-[color:var(--cream)]">Remover capa</button>
              </div>
            )}
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="mt-6 w-full rounded-full bg-gradient-to-r from-[color:var(--burnt)] to-[color:var(--wine)] py-3 font-display text-lg text-[color:var(--cream)] shadow-[0_10px_40px_-10px_oklch(0.55_0.18_25/0.7)] hover:shadow-[0_15px_50px_-10px_oklch(0.55_0.18_25/0.9)] transition-all disabled:opacity-60">
          {saving ? "Salvando..." : "Adicionar ❤️"}
        </button>
      </form>
    </div>,
    document.body
  );
}

/* ───────────────── Supabase helpers ───────────────── */
type BookRow = {
  id: string; title: string; author: string; month: string;
  cover_url: string | null; participants: string[] | null;
};
type ReviewRow = {
  id: string; book_id: string; person: string;
  completed: boolean; rating: number | null; comment: string | null;
};

async function loadAll(): Promise<Book[]> {
  const [{ data: bookRows }, { data: reviewRows }] = await Promise.all([
    supabase.from("books").select("*").order("month", { ascending: true }),
    supabase.from("book_reviews").select("*"),
  ]);
  const reviews = (reviewRows ?? []) as ReviewRow[];
  return ((bookRows ?? []) as BookRow[]).map((b) => {
    const rs = reviews.filter((r) => r.book_id === b.id);
    const toData = (p: string): PersonData => {
      const r = rs.find((x) => x.person === p);
      return r
        ? { completed: r.completed, rating: r.rating ?? undefined, comment: r.comment ?? undefined }
        : { ...emptyPerson };
    };
    return {
      id: b.id,
      title: b.title,
      author: b.author,
      month: b.month,
      reader: readerFromParticipants(b.participants),
      cover: b.cover_url ?? undefined,
      eliel: toData("eliel"),
      vitoria: toData("vitoria"),
    };
  });
}

async function upsertReview(bookId: string, person: string, data: PersonData) {
  await supabase.from("book_reviews").upsert(
    {
      book_id: bookId,
      person,
      completed: data.completed,
      rating: data.rating ?? null,
      comment: data.comment ?? null,
    },
    { onConflict: "book_id,person" }
  );
}

/* ───────────────── Page ───────────────── */
function ClubeDoLivroPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(monthKey(new Date()));
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const list = await loadAll();
      setBooks(list);
      setLoading(false);
    })();
  }, []);

  const addBook = async (b: Omit<Book, "id">) => {
    const cover_url = await ensureUploaded("book-covers", b.cover);
    const { data: bookRow } = await supabase
      .from("books")
      .insert({
        title: b.title,
        author: b.author,
        month: b.month,
        cover_url: cover_url ?? null,
        participants: participantsFromReader(b.reader),
      })
      .select()
      .single();
    if (!bookRow) return;
    const id = (bookRow as BookRow).id;
    await Promise.all([
      upsertReview(id, "eliel", b.eliel),
      upsertReview(id, "vitoria", b.vitoria),
    ]);
    setBooks((arr) => [...arr, { ...b, id, cover: cover_url ?? undefined }]);
  };

  const updateBook = async (b: Book) => {
    // Optimistic
    setBooks((arr) => arr.map((x) => (x.id === b.id ? b : x)));
    const cover_url = await ensureUploaded("book-covers", b.cover);
    await supabase
      .from("books")
      .update({
        title: b.title,
        author: b.author,
        month: b.month,
        cover_url: cover_url ?? null,
        participants: participantsFromReader(b.reader),
      })
      .eq("id", b.id);
    await Promise.all([
      upsertReview(b.id, "eliel", b.eliel),
      upsertReview(b.id, "vitoria", b.vitoria),
    ]);
    if (cover_url !== b.cover) {
      setBooks((arr) => arr.map((x) => (x.id === b.id ? { ...x, cover: cover_url ?? undefined } : x)));
    }
  };

  const deleteBook = async (id: string) => {
    setBooks((arr) => arr.filter((x) => x.id !== id));
    await supabase.from("books").delete().eq("id", id);
  };

  const visibleBooks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      return books.filter((b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        formatMonth(b.month).toLowerCase().includes(q)
      );
    }
    return books.filter((b) => b.month === currentMonth);
  }, [books, query, currentMonth]);

  return (
    <>
      {/* Library ambience background — only on this page */}
      <div
        aria-hidden
        className="fixed inset-0 z-0 bg-cover pointer-events-none"
        style={{ backgroundImage: `url(${libraryBg})`, backgroundPosition: "center top" }}
      />
      <div
        aria-hidden
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 70% 25%, transparent 0%, oklch(0.10 0.04 30 / 0.15) 60%, oklch(0.08 0.04 30 / 0.55) 100%), linear-gradient(180deg, transparent 0%, transparent 35%, oklch(0.10 0.04 30 / 0.55) 70%, oklch(0.08 0.04 25 / 0.8) 100%)",
        }}
      />

    <PageShell
      eyebrow="Capítulo 05"
      title="Clube do Livro"
      subtitle="Nosso refúgio entre páginas — leituras, anotações e estrelas."
    >
      {!loading && <StatsCards books={books} />}

      <div className="max-w-xl mx-auto mb-8 animate-fade-up">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--cream)]/50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título, autor ou mês..."
            className="w-full glass rounded-full pl-11 pr-4 py-3 text-sm text-[color:var(--cream)] placeholder:text-[color:var(--cream)]/40 outline-none focus:ring-1 focus:ring-[color:var(--rose-antique)]/40 transition"
          />
        </div>
      </div>

      {!query && (
        <div className="flex items-center justify-center gap-4 mb-8 animate-fade-up">
          <button
            onClick={() => setCurrentMonth((m) => shiftMonth(m, -1))}
            className="p-2.5 rounded-full glass hover:bg-[color:var(--burnt)]/30 transition-all hover:scale-110"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center min-w-[200px]">
            <p className="text-[10px] uppercase tracking-[0.4em] text-[color:var(--rose-antique)]">Lendo em</p>
            <h2 className="font-display text-3xl sm:text-4xl text-gradient-rose">{formatMonth(currentMonth)}</h2>
          </div>
          <button
            onClick={() => setCurrentMonth((m) => shiftMonth(m, 1))}
            className="p-2.5 rounded-full glass hover:bg-[color:var(--burnt)]/30 transition-all hover:scale-110"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {!query && (
        <div
          ref={railRef}
          className="flex gap-2 overflow-x-auto pb-3 mb-8 snap-x snap-mandatory scrollbar-none"
          style={{ scrollbarWidth: "none" }}
        >
          {Array.from({ length: 13 }, (_, i) => shiftMonth(currentMonth, i - 6)).map((mk) => {
            const active = mk === currentMonth;
            const count = books.filter((b) => b.month === mk).length;
            return (
              <button
                key={mk}
                onClick={() => setCurrentMonth(mk)}
                className={`snap-center shrink-0 rounded-full px-4 py-2 text-xs tracking-wide transition-all ${
                  active
                    ? "bg-[color:var(--burnt)]/80 text-[color:var(--cream)] shadow-[0_0_20px_oklch(0.55_0.18_25/0.5)]"
                    : "bg-[color:var(--ink)]/30 text-[color:var(--cream)]/60 hover:text-[color:var(--cream)] border border-[color:var(--cream)]/10"
                }`}
              >
                {formatMonth(mk)} {count > 0 && <span className="ml-1 opacity-70">· {count}</span>}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex justify-center mb-10">
        <button
          onClick={() => setModalOpen(true)}
          className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[color:var(--burnt)] to-[color:var(--wine)] px-6 py-3 font-display text-lg text-[color:var(--cream)] shadow-[0_10px_40px_-10px_oklch(0.55_0.18_25/0.7)] hover:shadow-[0_15px_50px_-10px_oklch(0.55_0.18_25/0.9)] hover:scale-105 transition-all"
        >
          <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
          Adicionar Livro ❤️
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[color:var(--cream)]/50">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : visibleBooks.length === 0 ? (
        <div className="text-center py-16 animate-fade-up">
          <BookOpen className="h-12 w-12 mx-auto text-[color:var(--rose-antique)]/50 mb-4" />
          <p className="text-[color:var(--cream)]/60">
            {query ? "Nenhum livro encontrado." : "Nenhum livro nesse mês ainda. Que tal começar uma leitura?"}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {visibleBooks.map((b) => (
            <BookCard key={b.id} book={b} onUpdate={updateBook} onDelete={() => deleteBook(b.id)} />
          ))}
        </div>
      )}

      <AddBookModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={addBook}
        defaultMonth={currentMonth}
      />
    </PageShell>
    </>
  );
}

export const Route = createFileRoute("/clube-do-livro")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Clube do Livro — Nosso Universo" },
      { name: "description", content: "Nosso clube do livro: leituras, anotações e estrelas." },
    ],
  }),
  component: ClubeDoLivroPage,
});
