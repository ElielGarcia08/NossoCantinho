import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import filmesBg from "@/assets/filmes-bg.png";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Search, X, Check, Film, Tv, Trash2, Loader2, Dices, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireAuth } from "@/lib/auth-route";

type Status = "pendente" | "em_andamento" | "concluido";
type Kind = "filme" | "serie";
type SeasonsData = { seasonsTotal?: number; episodes?: Record<string, number>; watched?: Record<string, number[]> };

type Item = {
  id: string;
  title: string;
  type: Kind;
  genre: string;
  notes: string | null;
  status: Status;
  seasons_data: SeasonsData;
  created_at: string;
};

const GENRES = [
  "Romance", "Comédia Romântica", "Drama", "Aventura", "Ação",
  "Fantasia", "Ficção Científica", "Terror", "Suspense", "Animação",
  "Documentário", "Outro",
];

const STATUS_LABEL: Record<Status, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

const sb = supabase.from("movies_series" as never) as any;

/* ───────── Add / Edit Modal ───────── */
function ItemModal({ onClose, onSaved, initial }: { onClose: () => void; onSaved: () => void; initial?: Item }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [type, setType] = useState<Kind>(initial?.type ?? "filme");
  const [genre, setGenre] = useState(initial?.genre ?? GENRES[0]);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [seasonsTotal, setSeasonsTotal] = useState<number>(initial?.seasons_data?.seasonsTotal ?? 1);
  const [episodes, setEpisodes] = useState<Record<string, number>>(initial?.seasons_data?.episodes ?? { "1": 10 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (type !== "serie") return;
    setEpisodes((prev) => {
      const next: Record<string, number> = {};
      for (let i = 1; i <= seasonsTotal; i++) next[String(i)] = prev[String(i)] ?? 10;
      return next;
    });
  }, [seasonsTotal, type]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const seasons_data: SeasonsData =
      type === "serie"
        ? { seasonsTotal, episodes, watched: initial?.seasons_data?.watched ?? {} }
        : {};
    const payload = {
      title: title.trim(),
      type,
      genre,
      notes: notes.trim() || null,
      seasons_data,
    };
    if (initial) {
      await sb.update(payload).eq("id", initial.id);
    } else {
      await sb.insert({ ...payload, status: "pendente" });
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-up">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <form onSubmit={submit} className="relative glass rounded-3xl p-6 sm:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10">
          <X className="h-4 w-4" />
        </button>
        <h2 className="font-display text-3xl text-gradient-rose mb-1">{initial ? "Editar" : "Adicionar"} Filme/Série</h2>
        <p className="text-sm text-[color:var(--cream)]/60 mb-6">Pra gente assistir junto.</p>

        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--rose-antique)]">Nome</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200}
              className="mt-1 w-full rounded-xl bg-[color:var(--ink)]/50 border border-[color:var(--cream)]/10 px-3 py-2.5 text-[color:var(--cream)] outline-none focus:border-[color:var(--rose-antique)]/50" />
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--rose-antique)]">Tipo</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["filme", "serie"] as const).map((t) => (
                <button type="button" key={t} onClick={() => setType(t)}
                  className={`rounded-full px-3 py-2 text-sm transition-all flex items-center justify-center gap-2 ${
                    type === t
                      ? "bg-[color:var(--burnt)]/80 text-[color:var(--cream)] shadow-[0_0_20px_oklch(0.55_0.18_25/0.5)]"
                      : "bg-[color:var(--ink)]/40 text-[color:var(--cream)]/70 border border-[color:var(--cream)]/10"
                  }`}>
                  {t === "filme" ? <Film className="h-4 w-4" /> : <Tv className="h-4 w-4" />}
                  {t === "filme" ? "Filme" : "Série"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--rose-antique)]">Gênero</label>
            <select value={genre} onChange={(e) => setGenre(e.target.value)}
              className="mt-1 w-full rounded-xl bg-[color:var(--ink)]/50 border border-[color:var(--cream)]/10 px-3 py-2.5 text-[color:var(--cream)] outline-none focus:border-[color:var(--rose-antique)]/50">
              {GENRES.map((g) => <option key={g} value={g} className="bg-[color:var(--ink)]">{g}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--rose-antique)]">Observação</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500}
              className="mt-1 w-full rounded-xl bg-[color:var(--ink)]/50 border border-[color:var(--cream)]/10 px-3 py-2.5 text-[color:var(--cream)] outline-none focus:border-[color:var(--rose-antique)]/50" />
          </div>

          {type === "serie" && (
            <div className="space-y-3 rounded-2xl border border-[color:var(--cream)]/10 bg-[color:var(--ink)]/30 p-4">
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--rose-antique)]">Nº de Temporadas</label>
                <input type="number" min={1} max={50} value={seasonsTotal}
                  onChange={(e) => setSeasonsTotal(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                  className="mt-1 w-24 rounded-xl bg-[color:var(--ink)]/50 border border-[color:var(--cream)]/10 px-3 py-2 text-[color:var(--cream)] outline-none focus:border-[color:var(--rose-antique)]/50" />
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--rose-antique)]">Episódios por temporada</p>
                {Array.from({ length: seasonsTotal }).map((_, i) => {
                  const k = String(i + 1);
                  return (
                    <div key={k} className="flex items-center gap-3 text-sm text-[color:var(--cream)]/85">
                      <span className="w-28">Temporada {i + 1}</span>
                      <input type="number" min={1} max={200} value={episodes[k] ?? 10}
                        onChange={(e) => setEpisodes({ ...episodes, [k]: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-20 rounded-lg bg-[color:var(--ink)]/50 border border-[color:var(--cream)]/10 px-2 py-1 outline-none focus:border-[color:var(--rose-antique)]/50" />
                      <span className="text-xs text-[color:var(--cream)]/60">episódios</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <button type="submit" disabled={saving}
          className="mt-6 w-full rounded-full bg-gradient-to-r from-[color:var(--burnt)] to-[color:var(--wine)] py-3 font-display text-lg text-[color:var(--cream)] shadow-[0_10px_40px_-10px_oklch(0.55_0.18_25/0.7)] disabled:opacity-60">
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </div>,
    document.body
  );
}

/* ───────── Series Episodes Drawer ───────── */
function SeriesDrawer({ item, onClose, onChanged }: { item: Item; onClose: () => void; onChanged: () => void }) {
  const sd = item.seasons_data ?? {};
  const total = sd.seasonsTotal ?? 0;
  const [watched, setWatched] = useState<Record<string, number[]>>(sd.watched ?? {});
  const [saving, setSaving] = useState(false);

  const totalEps = useMemo(() => {
    let t = 0;
    for (let i = 1; i <= total; i++) t += sd.episodes?.[String(i)] ?? 0;
    return t;
  }, [sd, total]);
  const watchedEps = useMemo(() => Object.values(watched).reduce((a, b) => a + b.length, 0), [watched]);
  const pct = totalEps ? Math.round((watchedEps / totalEps) * 100) : 0;

  const toggle = async (season: string, ep: number) => {
    const set = new Set(watched[season] ?? []);
    if (set.has(ep)) set.delete(ep); else set.add(ep);
    const next = { ...watched, [season]: Array.from(set).sort((a, b) => a - b) };
    setWatched(next);
    setSaving(true);
    const newTotalWatched = Object.values(next).reduce((a, b) => a + b.length, 0);
    const allDone = totalEps > 0 && newTotalWatched >= totalEps;
    const anyDone = newTotalWatched > 0;
    const status: Status = allDone ? "concluido" : anyDone ? "em_andamento" : "pendente";
    await sb.update({
      seasons_data: { ...sd, watched: next },
      status,
    }).eq("id", item.id);
    setSaving(false);
    onChanged();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-up">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative glass rounded-3xl p-6 sm:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10">
          <X className="h-4 w-4" />
        </button>
        <h2 className="font-display text-3xl text-gradient-rose">{item.title}</h2>
        <p className="text-sm text-[color:var(--cream)]/60 mb-4">{item.genre} · Série</p>

        <div className="mb-5">
          <div className="flex justify-between text-xs text-[color:var(--cream)]/70 mb-1.5">
            <span>{watchedEps} de {totalEps} episódios</span>
            <span>{pct}% {saving && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}</span>
          </div>
          <div className="h-2 rounded-full bg-[color:var(--ink)]/60 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[color:var(--burnt)] to-[color:var(--rose-antique)] transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="space-y-4">
          {Array.from({ length: total }).map((_, i) => {
            const k = String(i + 1);
            const epCount = sd.episodes?.[k] ?? 0;
            const ws = watched[k] ?? [];
            return (
              <div key={k} className="rounded-2xl border border-[color:var(--cream)]/10 bg-[color:var(--ink)]/30 p-4">
                <p className="font-display text-lg text-[color:var(--cream)] mb-2">Temporada {i + 1}</p>
                <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                  {Array.from({ length: epCount }).map((__, j) => {
                    const ep = j + 1;
                    const done = ws.includes(ep);
                    return (
                      <button key={ep} onClick={() => toggle(k, ep)}
                        className={`aspect-square rounded-lg text-xs font-mono transition-all flex items-center justify-center ${
                          done
                            ? "bg-[color:var(--burnt)]/80 text-[color:var(--cream)] shadow-[0_0_12px_oklch(0.55_0.18_25/0.5)]"
                            : "bg-[color:var(--ink)]/50 text-[color:var(--cream)]/60 border border-[color:var(--cream)]/10 hover:border-[color:var(--rose-antique)]/50"
                        }`}>
                        {done ? <Check className="h-3.5 w-3.5" /> : ep}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ───────── Card ───────── */
function ItemCard({ item, onClick, onComplete, onDelete }: {
  item: Item;
  onClick: () => void;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const statusColor: Record<Status, string> = {
    pendente: "bg-[color:var(--cream)]/10 text-[color:var(--cream)]/70",
    em_andamento: "bg-amber-500/20 text-amber-200",
    concluido: "bg-emerald-500/20 text-emerald-200",
  };
  return (
    <div onClick={onClick}
      className="group relative rounded-3xl border border-white/10 bg-[color:var(--ink)]/55 backdrop-blur-xl p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--rose-antique)]/40 cursor-pointer animate-fade-up">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-[color:var(--rose-antique)]">
          {item.type === "filme" ? <Film className="h-4 w-4" /> : <Tv className="h-4 w-4" />}
          <span className="text-[10px] uppercase tracking-[0.3em]">{item.type === "filme" ? "Filme" : "Série"}</span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-white/10 text-[color:var(--cream)]/60">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <h3 className="mt-2 font-display text-2xl text-[color:var(--cream)] leading-tight">{item.title}</h3>
      <p className="text-xs text-[color:var(--cream)]/60 mt-1">{item.genre}</p>
      {item.notes && <p className="mt-3 text-sm text-[color:var(--cream)]/75 italic line-clamp-2">"{item.notes}"</p>}
      <div className="mt-4 flex items-center justify-between">
        <span className={`text-[10px] uppercase tracking-[0.25em] px-2.5 py-1 rounded-full ${statusColor[item.status]}`}>
          {STATUS_LABEL[item.status]}
        </span>
        {item.type === "filme" && item.status !== "concluido" && (
          <button onClick={(e) => { e.stopPropagation(); onComplete(); }}
            className="text-xs px-3 py-1.5 rounded-full bg-[color:var(--burnt)]/70 hover:bg-[color:var(--burnt)] text-[color:var(--cream)] transition flex items-center gap-1.5">
            <Check className="h-3 w-3" /> Concluir
          </button>
        )}
      </div>
    </div>
  );
}

/* ───────── Raffle Modal ───────── */
function RaffleModal({ items, onClose }: { items: Item[]; onClose: () => void }) {
  const [fType, setFType] = useState<"todos" | Kind>("todos");
  const [fGenre, setFGenre] = useState<string>("todos");
  const [fStatus, setFStatus] = useState<"todos" | "pendente" | "em_andamento">("pendente");
  const [rolling, setRolling] = useState(false);
  const [display, setDisplay] = useState<Item | null>(null);
  const [result, setResult] = useState<Item | null>(null);

  const pool = useMemo(() => items.filter((it) => {
    if (fType !== "todos" && it.type !== fType) return false;
    if (fGenre !== "todos" && it.genre !== fGenre) return false;
    if (fStatus !== "todos" && it.status !== fStatus) return false;
    return true;
  }), [items, fType, fGenre, fStatus]);

  const roll = () => {
    if (pool.length === 0) { setResult(null); setDisplay(null); return; }
    setResult(null);
    setRolling(true);
    const start = Date.now();
    const duration = 1700;
    const tick = () => {
      const elapsed = Date.now() - start;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      setDisplay(pick);
      if (elapsed >= duration) {
        const final = pool[Math.floor(Math.random() * pool.length)];
        setDisplay(final);
        setResult(final);
        setRolling(false);
        return;
      }
      const delay = 60 + Math.floor((elapsed / duration) * 180);
      setTimeout(tick, delay);
    };
    tick();
  };

  const clearFilters = () => { setFType("todos"); setFGenre("todos"); setFStatus("pendente"); };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-up">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative glass rounded-3xl p-6 sm:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10">
          <X className="h-4 w-4" />
        </button>
        <h2 className="font-display text-3xl text-gradient-rose">Vamos escolher algo para assistir?</h2>
        <p className="text-sm text-[color:var(--cream)]/60 mb-5">Deixa a sorte decidir nossa próxima sessão. 🍿</p>

        {!result && !rolling && (
          <div className="space-y-3 mb-5">
            <div className="grid grid-cols-3 gap-2">
              <select value={fType} onChange={(e) => setFType(e.target.value as any)}
                className="rounded-full bg-[color:var(--ink)]/55 border border-[color:var(--cream)]/10 px-3 py-2 text-xs text-[color:var(--cream)] outline-none">
                <option value="todos">Todos tipos</option>
                <option value="filme">Filmes</option>
                <option value="serie">Séries</option>
              </select>
              <select value={fStatus} onChange={(e) => setFStatus(e.target.value as any)}
                className="rounded-full bg-[color:var(--ink)]/55 border border-[color:var(--cream)]/10 px-3 py-2 text-xs text-[color:var(--cream)] outline-none">
                <option value="pendente">Pendentes</option>
                <option value="em_andamento">Em andamento</option>
                <option value="todos">Todos status</option>
              </select>
              <select value={fGenre} onChange={(e) => setFGenre(e.target.value)}
                className="rounded-full bg-[color:var(--ink)]/55 border border-[color:var(--cream)]/10 px-3 py-2 text-xs text-[color:var(--cream)] outline-none">
                <option value="todos">Todos gêneros</option>
                {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Roll display */}
        <div className="my-6 min-h-[140px] flex items-center justify-center">
          {pool.length === 0 ? (
            <div className="text-center">
              <p className="text-[color:var(--cream)]/75 mb-3">Nenhum filme ou série encontrado com os filtros selecionados.</p>
              <button onClick={clearFilters}
                className="text-xs px-4 py-2 rounded-full bg-[color:var(--ink)]/50 border border-[color:var(--cream)]/15 hover:border-[color:var(--rose-antique)]/50 text-[color:var(--cream)]">
                Limpar filtros
              </button>
            </div>
          ) : rolling && display ? (
            <div key={display.id} className="text-center animate-fade-up">
              <div className="flex items-center justify-center gap-2 text-[color:var(--rose-antique)] text-[10px] uppercase tracking-[0.3em] mb-1">
                {display.type === "filme" ? <Film className="h-3 w-3" /> : <Tv className="h-3 w-3" />}
                {display.type === "filme" ? "Filme" : "Série"}
              </div>
              <p className="font-display text-3xl text-[color:var(--cream)] leading-tight">{display.title}</p>
            </div>
          ) : result ? (
            <div className="w-full text-center rounded-2xl border border-[color:var(--rose-antique)]/40 bg-[color:var(--ink)]/55 p-5 shadow-[0_0_40px_-10px_oklch(0.65_0.12_15/0.6)] animate-fade-up">
              <div className="flex items-center justify-center gap-2 text-[color:var(--rose-antique)] text-[10px] uppercase tracking-[0.3em] mb-1">
                {result.type === "filme" ? <Film className="h-3 w-3" /> : <Tv className="h-3 w-3" />}
                {result.type === "filme" ? "Filme" : "Série"} · {result.genre}
              </div>
              <p className="font-display text-3xl text-gradient-rose leading-tight">{result.title}</p>
              {result.notes && <p className="mt-2 text-sm text-[color:var(--cream)]/75 italic">"{result.notes}"</p>}
            </div>
          ) : (
            <p className="text-[color:var(--cream)]/50 text-sm">{pool.length} {pool.length === 1 ? "candidato" : "candidatos"} no sorteio</p>
          )}
        </div>

        {pool.length > 0 && (
          <div className="flex gap-2">
            {result ? (
              <>
                <button onClick={onClose}
                  className="flex-1 rounded-full bg-gradient-to-r from-[color:var(--burnt)] to-[color:var(--wine)] py-3 font-display text-[color:var(--cream)]">
                  Assistir Agora
                </button>
                <button onClick={roll} disabled={rolling}
                  className="rounded-full bg-[color:var(--ink)]/60 border border-[color:var(--cream)]/15 px-4 py-3 text-sm text-[color:var(--cream)] flex items-center gap-2 hover:border-[color:var(--rose-antique)]/50">
                  <RefreshCw className="h-4 w-4" /> Sortear Novamente
                </button>
              </>
            ) : (
              <button onClick={roll} disabled={rolling}
                className="w-full rounded-full bg-gradient-to-r from-[color:var(--burnt)] to-[color:var(--wine)] py-3 font-display text-lg text-[color:var(--cream)] flex items-center justify-center gap-2 disabled:opacity-70">
                <Dices className="h-5 w-5" /> {rolling ? "Sorteando..." : "Sortear"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/* ───────── Page ───────── */
function FilmesPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showRaffle, setShowRaffle] = useState(false);
  const [activeSeries, setActiveSeries] = useState<Item | null>(null);
  const [q, setQ] = useState("");
  const [fType, setFType] = useState<"todos" | Kind>("todos");
  const [fStatus, setFStatus] = useState<"todos" | Status>("todos");
  const [fGenre, setFGenre] = useState<string>("todos");

  const load = async () => {
    const { data } = await sb.select("*").order("created_at", { ascending: false });
    setItems((data as Item[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter((it) => {
    if (fType !== "todos" && it.type !== fType) return false;
    if (fStatus !== "todos" && it.status !== fStatus) return false;
    if (fGenre !== "todos" && it.genre !== fGenre) return false;
    if (q.trim()) {
      const s = q.toLowerCase();
      if (!it.title.toLowerCase().includes(s) && !it.genre.toLowerCase().includes(s) && !it.type.toLowerCase().includes(s)) return false;
    }
    return true;
  }), [items, q, fType, fStatus, fGenre]);

  const stats = useMemo(() => {
    const filmes = items.filter((i) => i.type === "filme" && i.status === "concluido").length;
    const series = items.filter((i) => i.type === "serie" && i.status === "concluido").length;
    let eps = 0;
    items.forEach((i) => { if (i.type === "serie") eps += Object.values(i.seasons_data?.watched ?? {}).reduce((a, b) => a + b.length, 0); });
    return { filmes, series, eps };
  }, [items]);

  const completeFilm = async (id: string) => {
    await sb.update({ status: "concluido" }).eq("id", id);
    load();
  };
  const remove = async (id: string) => {
    if (!confirm("Remover este item?")) return;
    await sb.delete().eq("id", id);
    load();
  };

  return (
    <>
      {/* Background — complete cinema scene with blurred visual extension */}
      <div aria-hidden className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[color:var(--ink)]">
        <img
          src={filmesBg}
          alt=""
          className="absolute inset-0 h-full w-full scale-125 object-cover blur-3xl opacity-80"
        />
        <img
          src={filmesBg}
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
        />
      </div>
      <div aria-hidden className="fixed inset-0 z-0 pointer-events-none" style={{ background: "rgba(0,0,0,0.28)" }} />

      <PageShell eyebrow="Capítulo 04" title="Filmes & Séries" subtitle="Histórias pra dividir no sofá.">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-5 mb-8">
          {[
            { label: "Filmes Concluídos", value: stats.filmes },
            { label: "Séries Concluídas", value: stats.series },
            { label: "Episódios Assistidos", value: stats.eps },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/10 bg-[color:var(--ink)]/55 backdrop-blur-xl p-4 sm:p-5 text-center">
              <p className="font-display text-3xl sm:text-4xl text-gradient-rose">{s.value}</p>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--cream)]/70 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--cream)]/50" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar..."
              className="w-full pl-10 pr-3 py-2.5 rounded-full bg-[color:var(--ink)]/55 backdrop-blur-xl border border-[color:var(--cream)]/10 text-sm text-[color:var(--cream)] outline-none focus:border-[color:var(--rose-antique)]/50" />
          </div>
          <button onClick={() => setShowRaffle(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[color:var(--ink)]/55 backdrop-blur-xl border border-[color:var(--rose-antique)]/40 text-[color:var(--cream)] text-sm font-medium hover:border-[color:var(--rose-antique)] transition">
            <Dices className="h-4 w-4" /> Sortear Filme/Série
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[color:var(--burnt)] to-[color:var(--wine)] text-[color:var(--cream)] text-sm font-medium shadow-[0_10px_40px_-10px_oklch(0.55_0.18_25/0.7)]">
            <Plus className="h-4 w-4" /> Adicionar Filme/Série
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          <select value={fType} onChange={(e) => setFType(e.target.value as any)}
            className="rounded-full bg-[color:var(--ink)]/55 backdrop-blur-xl border border-[color:var(--cream)]/10 px-4 py-2 text-xs text-[color:var(--cream)] outline-none">
            <option value="todos">Todos os tipos</option>
            <option value="filme">Filmes</option>
            <option value="serie">Séries</option>
          </select>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value as any)}
            className="rounded-full bg-[color:var(--ink)]/55 backdrop-blur-xl border border-[color:var(--cream)]/10 px-4 py-2 text-xs text-[color:var(--cream)] outline-none">
            <option value="todos">Todos os status</option>
            <option value="pendente">Pendentes</option>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluídos</option>
          </select>
          <select value={fGenre} onChange={(e) => setFGenre(e.target.value)}
            className="rounded-full bg-[color:var(--ink)]/55 backdrop-blur-xl border border-[color:var(--cream)]/10 px-4 py-2 text-xs text-[color:var(--cream)] outline-none">
            <option value="todos">Todos os gêneros</option>
            {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <p className="text-center text-[color:var(--cream)]/60">Carregando...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[color:var(--cream)]/70">
            <Film className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Nenhum filme ou série por aqui ainda.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((it) => (
              <ItemCard key={it.id} item={it}
                onClick={() => { if (it.type === "serie") setActiveSeries(it); }}
                onComplete={() => completeFilm(it.id)}
                onDelete={() => remove(it.id)} />
            ))}
          </div>
        )}
      </PageShell>

      {showAdd && <ItemModal onClose={() => setShowAdd(false)} onSaved={load} />}
      {showRaffle && <RaffleModal items={items} onClose={() => setShowRaffle(false)} />}
      {activeSeries && (
        <SeriesDrawer item={activeSeries} onClose={() => setActiveSeries(null)}
          onChanged={() => { load(); /* refresh active */
            sb.select("*").eq("id", activeSeries.id).maybeSingle().then(({ data }: any) => { if (data) setActiveSeries(data as Item); });
          }} />
      )}
    </>
  );
}

export const Route = createFileRoute("/filmes")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Filmes & Séries — Nosso Universo" },
      { name: "description", content: "Histórias pra dividir no sofá: filmes e séries que queremos ver juntos." },
    ],
  }),
  component: FilmesPage,
});
