import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, X, Heart, Loader2, Trash2, Check, ImagePlus, Sparkles, Trophy, Clock,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { ensureUploaded } from "@/lib/storage-upload";

export const Route = createFileRoute("/quiz")({ component: DesafiosPage });

type Challenged = "eliel" | "vitoria" | "casal";
type Period = "diario" | "semanal" | "mensal" | "trimestral";
type Difficulty = "facil" | "medio" | "dificil" | "muito_dificil";
type Status = "pendente" | "concluido";

type Challenge = {
  id: string;
  title: string;
  description: string | null;
  challenged: Challenged;
  period: Period;
  difficulty: Difficulty;
  due_date: string;
  status: Status;
  completion_photo_url: string | null;
  completed_at: string | null;
  saved_to_moments: boolean;
  created_at: string;
};

const CHALLENGED_LABEL: Record<Challenged, string> = {
  eliel: "Eliel", vitoria: "Vitória", casal: "Nós dois",
};
const PERIOD_LABEL: Record<Period, string> = {
  diario: "Diário", semanal: "Semanal", mensal: "Mensal", trimestral: "Trimestral",
};
const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  facil: "Fácil", medio: "Médio", dificil: "Difícil", muito_dificil: "Muito difícil",
};
const DIFFICULTY_ORDER: Difficulty[] = ["facil", "medio", "dificil", "muito_dificil"];
const PERIOD_ORDER: Period[] = ["diario", "semanal", "mensal", "trimestral"];

function computeDueDate(period: Period): string {
  const d = new Date();
  if (period === "diario") d.setDate(d.getDate() + 1);
  else if (period === "semanal") d.setDate(d.getDate() + 7);
  else if (period === "mensal") d.setMonth(d.getMonth() + 1);
  else d.setMonth(d.getMonth() + 3);
  return d.toISOString().slice(0, 10);
}

function fmtDate(iso: string | null) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
function fmtDateTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function DesafiosPage() {
  const [items, setItems] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<Challenge | null>(null);
  const [tab, setTab] = useState<Challenged>("casal");
  const [statusView, setStatusView] = useState<"pendente" | "concluido">("pendente");
  const [periodFilter, setPeriodFilter] = useState<"all" | Period>("all");
  const [diffFilter, setDiffFilter] = useState<"all" | Difficulty>("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("challenges").select("*").order("created_at", { ascending: false });
      setItems((data ?? []) as unknown as Challenge[]);
      setLoading(false);
    })();
  }, []);

  const upsert = async (c: Partial<Challenge> & { id?: string }) => {
    if (c.id) {
      const { data } = await supabase.from("challenges").update(c as never).eq("id", c.id).select().single();
      if (data) setItems((p) => p.map((x) => (x.id === c.id ? (data as unknown as Challenge) : x)));
      return data as unknown as Challenge;
    }
    const { data } = await supabase.from("challenges").insert(c as never).select().single();
    if (data) setItems((p) => [data as unknown as Challenge, ...p]);
    return data as unknown as Challenge;
  };

  const remove = async (id: string) => {
    await supabase.from("challenges").delete().eq("id", id);
    setItems((p) => p.filter((x) => x.id !== id));
    setDetail(null);
  };

  const filtered = useMemo(() => {
    return items.filter((c) =>
      c.challenged === tab &&
      c.status === statusView &&
      (periodFilter === "all" || c.period === periodFilter) &&
      (diffFilter === "all" || c.difficulty === diffFilter),
    );
  }, [items, tab, statusView, periodFilter, diffFilter]);

  const isEliel = tab === "eliel";

  return (
    <>
      <div aria-hidden className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: isEliel
            ? "radial-gradient(circle at 20% 10%, oklch(0.28 0.12 250 / 0.55), transparent 55%), radial-gradient(circle at 80% 90%, oklch(0.22 0.10 240 / 0.55), transparent 60%), oklch(0.10 0.05 240)"
            : "radial-gradient(circle at 20% 10%, oklch(0.35 0.15 18 / 0.45), transparent 55%), radial-gradient(circle at 80% 90%, oklch(0.25 0.12 15 / 0.45), transparent 60%), oklch(0.08 0.04 20)",
        }}
      />
      <PageShell
        eyebrow="Capítulo 02"
        title="Desafios"
        subtitle="Nossos pequenos jogos de amor — desafios pra gente viver mais juntos."
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-1.5 glass rounded-full p-1">
            {(["eliel", "vitoria", "casal"] as Challenged[]).map((t) => {
              const active = tab === t;
              return (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-full text-xs tracking-wide transition-all ${
                    active
                      ? t === "eliel"
                        ? "bg-gradient-to-r from-[oklch(0.45_0.15_240)] to-[oklch(0.30_0.12_245)] text-[color:var(--cream)]"
                        : "bg-gradient-to-r from-[color:var(--burnt)] to-[color:var(--wine)] text-[color:var(--cream)]"
                      : "text-[color:var(--cream)]/60 hover:text-[color:var(--cream)]"
                  }`}>
                  {CHALLENGED_LABEL[t]}
                </button>
              );
            })}
          </div>
          <button onClick={() => setCreating(true)}
            className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[color:var(--burnt)] to-[color:var(--wine)] text-[color:var(--cream)] shadow-[0_10px_30px_-10px_oklch(0.35_0.10_18/0.7)] hover:scale-[1.03] transition-all">
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
            <span className="text-sm font-medium tracking-wide">Adicionar desafio</span>
            <Heart className="h-3.5 w-3.5 fill-current text-[color:var(--rose-antique)]" />
          </button>
        </div>

        <StatsRow items={items} />

        <div className="mt-8 flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-1 glass rounded-full p-1">
            {(["pendente", "concluido"] as const).map((s) => (
              <button key={s} onClick={() => setStatusView(s)}
                className={`px-3.5 py-1.5 rounded-full text-xs tracking-wide transition-all ${
                  statusView === s
                    ? "bg-[color:var(--burnt)]/40 text-[color:var(--cream)]"
                    : "text-[color:var(--cream)]/60 hover:text-[color:var(--cream)]"
                }`}>
                {s === "pendente" ? "Pendentes" : "Concluídos"}
              </button>
            ))}
          </div>
          <Select label="Período" value={periodFilter} onChange={(v) => setPeriodFilter(v as "all" | Period)}
            options={[{ value: "all", label: "Todos" }, ...PERIOD_ORDER.map((p) => ({ value: p, label: PERIOD_LABEL[p] }))]} />
          <Select label="Dificuldade" value={diffFilter} onChange={(v) => setDiffFilter(v as "all" | Difficulty)}
            options={[{ value: "all", label: "Todas" }, ...DIFFICULTY_ORDER.map((d) => ({ value: d, label: DIFFICULTY_LABEL[d] }))]} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-[color:var(--cream)]/50">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[color:var(--cream)]/50">
            <Sparkles className="h-6 w-6 mx-auto mb-3 text-[color:var(--rose-antique)]" />
            <p className="text-sm">Nenhum desafio por aqui ainda ❤️</p>
          </div>
        ) : (
          <ChallengeTable items={filtered} onOpen={setDetail} showCompleted={statusView === "concluido"} />
        )}

        {creating && (
          <ChallengeFormModal
            defaultChallenged={tab}
            onClose={() => setCreating(false)}
            onSave={async (c) => { await upsert(c); setCreating(false); }}
          />
        )}

        {detail && (
          <ChallengeDetailModal
            challenge={detail}
            onClose={() => setDetail(null)}
            onDelete={() => remove(detail.id)}
            onComplete={async (photoUrl, toMoments) => {
              const completed_at = new Date().toISOString();
              const updated = await upsert({
                id: detail.id,
                status: "concluido",
                completion_photo_url: photoUrl,
                completed_at,
                saved_to_moments: toMoments,
              });
              if (toMoments && updated) {
                const url = new URL("/momentos", window.location.origin);
                url.searchParams.set("title", updated.title);
                url.searchParams.set("date", completed_at.slice(0, 10));
                url.searchParams.set("comment", `Conclusão do desafio: ${updated.title}`);
                if (photoUrl) url.searchParams.set("image", photoUrl);
                window.location.href = url.toString();
                return;
              }
              setDetail(null);
            }}
          />
        )}
      </PageShell>
    </>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <label className="inline-flex items-center gap-2 glass rounded-full px-3 py-1.5 text-xs text-[color:var(--cream)]/70">
      <span className="uppercase tracking-[0.2em] text-[10px] text-[color:var(--rose-antique)]">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="bg-transparent outline-none text-[color:var(--cream)] text-xs">
        {options.map((o) => <option key={o.value} value={o.value} className="bg-[color:var(--ink)]">{o.label}</option>)}
      </select>
    </label>
  );
}

function StatsRow({ items }: { items: Challenge[] }) {
  const groups: { key: Challenged; label: string; accent: string }[] = [
    { key: "eliel", label: "Eliel", accent: "from-[oklch(0.45_0.15_240)] to-[oklch(0.30_0.12_245)]" },
    { key: "vitoria", label: "Vitória", accent: "from-[color:var(--burnt)] to-[color:var(--wine)]" },
    { key: "casal", label: "Casal", accent: "from-[color:var(--rose-antique)] to-[color:var(--wine)]" },
  ];
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {groups.map((g) => {
        const list = items.filter((x) => x.challenged === g.key);
        const done = list.filter((x) => x.status === "concluido");
        const pending = list.length - done.length;
        const byDiff: Record<Difficulty, number> = { facil: 0, medio: 0, dificil: 0, muito_dificil: 0 };
        done.forEach((d) => { byDiff[d.difficulty]++; });
        return (
          <div key={g.key} className="glass rounded-3xl p-5 border border-[color:var(--rose-antique)]/15 relative overflow-hidden">
            <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${g.accent}`} />
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-xl text-[color:var(--cream)]">{g.label}</h3>
              <Trophy className="h-4 w-4 text-[color:var(--rose-antique)]" />
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-display text-4xl text-gradient-rose">{done.length}</span>
              <span className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--cream)]/60">concluídos</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {DIFFICULTY_ORDER.map((d) => (
                <div key={d} className="text-center">
                  <p className="text-base font-display text-[color:var(--cream)]">{byDiff[d]}</p>
                  <p className="text-[9px] uppercase tracking-wider text-[color:var(--cream)]/50">{DIFFICULTY_LABEL[d]}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[color:var(--cream)]/70 pt-3 border-t border-white/5">
              <Clock className="h-3 w-3 text-[color:var(--rose-antique)]" />
              <span>{pending} pendente{pending === 1 ? "" : "s"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChallengeTable({ items, onOpen, showCompleted }: {
  items: Challenge[]; onOpen: (c: Challenge) => void; showCompleted: boolean;
}) {
  return (
    <div className="glass rounded-2xl border border-[color:var(--rose-antique)]/15 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--rose-antique)] border-b border-white/5">
              <th className="text-left px-4 py-3 font-normal">Título</th>
              <th className="text-left px-4 py-3 font-normal hidden md:table-cell">Desafiado</th>
              <th className="text-left px-4 py-3 font-normal hidden sm:table-cell">Período</th>
              <th className="text-left px-4 py-3 font-normal hidden md:table-cell">Dificuldade</th>
              <th className="text-left px-4 py-3 font-normal hidden lg:table-cell">Data limite</th>
              {showCompleted && <th className="text-left px-4 py-3 font-normal hidden lg:table-cell">Concluído em</th>}
              <th className="text-left px-4 py-3 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} onClick={() => onOpen(c)}
                className="border-b border-white/5 last:border-0 cursor-pointer hover:bg-[color:var(--burnt)]/10 transition">
                <td className="px-4 py-3 text-[color:var(--cream)]">
                  <div className="font-medium">{c.title}</div>
                  <div className="text-[11px] text-[color:var(--cream)]/50 md:hidden">
                    {CHALLENGED_LABEL[c.challenged]} · {DIFFICULTY_LABEL[c.difficulty]}
                  </div>
                </td>
                <td className="px-4 py-3 text-[color:var(--cream)]/80 hidden md:table-cell">{CHALLENGED_LABEL[c.challenged]}</td>
                <td className="px-4 py-3 text-[color:var(--cream)]/70 hidden sm:table-cell">{PERIOD_LABEL[c.period]}</td>
                <td className="px-4 py-3 text-[color:var(--cream)]/70 hidden md:table-cell">{DIFFICULTY_LABEL[c.difficulty]}</td>
                <td className="px-4 py-3 text-[color:var(--cream)]/70 hidden lg:table-cell">{fmtDate(c.due_date)}</td>
                {showCompleted && <td className="px-4 py-3 text-[color:var(--cream)]/70 hidden lg:table-cell">{fmtDateTime(c.completed_at)}</td>}
                <td className="px-4 py-3">
                  <span className={`text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full ${
                    c.status === "concluido"
                      ? "bg-[color:var(--rose-antique)]/20 text-[color:var(--rose-antique)]"
                      : "bg-[color:var(--burnt)]/20 text-[color:var(--cream)]/70"
                  }`}>
                    {c.status === "concluido" ? "Concluído" : "Pendente"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChallengeFormModal({ defaultChallenged, onClose, onSave }: {
  defaultChallenged: Challenged;
  onClose: () => void;
  onSave: (c: Partial<Challenge>) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [challenged, setChallenged] = useState<Challenged>(defaultChallenged);
  const [period, setPeriod] = useState<Period>("semanal");
  const [difficulty, setDifficulty] = useState<Difficulty>("medio");
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
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        challenged, period, difficulty,
        due_date: computeDueDate(period),
        status: "pendente",
      });
    } catch (e) { setError("Erro ao salvar."); console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} title="Novo desafio" eyebrow="Mais uma aventura nossa">
      <div className="space-y-4">
        <Field label="Título">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
            placeholder="Escrever uma carta à mão..." className="w-full bg-transparent text-[color:var(--cream)] outline-none placeholder:text-[color:var(--cream)]/30" />
        </Field>
        <Field label="Descrição (opcional)">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            placeholder="Detalhes do desafio..." className="w-full bg-transparent text-[color:var(--cream)] outline-none placeholder:text-[color:var(--cream)]/30 resize-none" />
        </Field>
        <Field label="Quem será desafiado">
          <div className="flex flex-wrap gap-2">
            {(["eliel", "vitoria", "casal"] as Challenged[]).map((c) => (
              <Chip key={c} active={challenged === c} onClick={() => setChallenged(c)}>{CHALLENGED_LABEL[c]}</Chip>
            ))}
          </div>
        </Field>
        <Field label="Período">
          <div className="flex flex-wrap gap-2">
            {PERIOD_ORDER.map((p) => (
              <Chip key={p} active={period === p} onClick={() => setPeriod(p)}>{PERIOD_LABEL[p]}</Chip>
            ))}
          </div>
          <p className="text-[11px] text-[color:var(--cream)]/50 mt-2">
            Data limite: {fmtDate(computeDueDate(period))}
          </p>
        </Field>
        <Field label="Dificuldade">
          <div className="flex flex-wrap gap-2">
            {DIFFICULTY_ORDER.map((d) => (
              <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>{DIFFICULTY_LABEL[d]}</Chip>
            ))}
          </div>
        </Field>
        {error && <p className="text-xs text-[color:var(--rose-antique)]">{error}</p>}
      </div>

      <div className="px-5 py-4 border-t border-white/5 flex items-center justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-full glass border border-white/10 text-[color:var(--cream)]/70 text-sm hover:text-[color:var(--cream)] transition">
          Cancelar
        </button>
        <button onClick={submit} disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-[color:var(--burnt)] to-[color:var(--wine)] text-[color:var(--cream)] text-sm hover:scale-[1.03] transition disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-3.5 w-3.5 fill-current text-[color:var(--rose-antique)]" />}
          Salvar
        </button>
      </div>
    </Modal>
  );
}

function ChallengeDetailModal({ challenge, onClose, onDelete, onComplete }: {
  challenge: Challenge;
  onClose: () => void;
  onDelete: () => void;
  onComplete: (photoUrl: string | null, toMoments: boolean) => Promise<void>;
}) {
  const [photo, setPhoto] = useState<string | null>(challenge.completion_photo_url);
  const [uploading, setUploading] = useState(false);
  const [askMoments, setAskMoments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const pickFile = async (file: File) => {
    setUploading(true);
    try {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result as string);
        reader.onerror = () => rej(reader.error);
        reader.readAsDataURL(file);
      });
      const url = await ensureUploaded("moments-images", dataUrl);
      if (url) setPhoto(url);
    } finally { setUploading(false); }
  };

  const isPending = challenge.status === "pendente";

  const handleConfirm = async (toMoments: boolean) => {
    setSaving(true);
    try { await onComplete(photo, toMoments); }
    finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} title={challenge.title}
      eyebrow={`${CHALLENGED_LABEL[challenge.challenged]} · ${PERIOD_LABEL[challenge.period]} · ${DIFFICULTY_LABEL[challenge.difficulty]}`}>
      <div className="space-y-4">
        {challenge.description && (
          <p className="text-sm text-[color:var(--cream)]/75 italic">"{challenge.description}"</p>
        )}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <Info label="Criado em">{fmtDate(challenge.created_at)}</Info>
          <Info label="Data limite">{fmtDate(challenge.due_date)}</Info>
          <Info label="Status">{challenge.status === "concluido" ? "Concluído" : "Pendente"}</Info>
          {challenge.completed_at && <Info label="Concluído em">{fmtDateTime(challenge.completed_at)}</Info>}
        </div>

        {(photo || challenge.completion_photo_url) && (
          <div className="rounded-2xl overflow-hidden border border-[color:var(--rose-antique)]/20">
            <img src={photo ?? challenge.completion_photo_url!} alt="Conclusão" className="w-full max-h-72 object-cover" />
          </div>
        )}

        {isPending && !askMoments && (
          <div className="space-y-3 pt-2 border-t border-white/5">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--rose-antique)]">Concluir desafio</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }} />
            <button onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-[color:var(--rose-antique)]/30 text-[color:var(--cream)]/80 text-xs hover:text-[color:var(--cream)] transition">
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
              {photo ? "Trocar foto" : "Anexar foto (opcional)"}
            </button>
          </div>
        )}

        {askMoments && (
          <div className="rounded-2xl p-4 bg-[color:var(--burnt)]/15 border border-[color:var(--rose-antique)]/20 space-y-3">
            <p className="text-sm text-[color:var(--cream)]">Deseja registrar a conclusão na aba "Nossos Momentos"?</p>
            <div className="flex gap-2">
              <button disabled={saving} onClick={() => handleConfirm(true)}
                className="flex-1 px-4 py-2 rounded-full bg-gradient-to-r from-[color:var(--burnt)] to-[color:var(--wine)] text-[color:var(--cream)] text-sm hover:scale-[1.02] transition disabled:opacity-60">
                Sim
              </button>
              <button disabled={saving} onClick={() => handleConfirm(false)}
                className="flex-1 px-4 py-2 rounded-full glass border border-white/10 text-[color:var(--cream)]/80 text-sm hover:text-[color:var(--cream)] transition disabled:opacity-60">
                Não
              </button>
            </div>
          </div>
        )}

        {confirmDelete && (
          <div className="rounded-2xl p-4 bg-[color:var(--wine)]/20 border border-[color:var(--rose-antique)]/30 space-y-3">
            <p className="text-sm text-[color:var(--cream)]">Excluir este desafio?</p>
            <div className="flex gap-2">
              <button onClick={onDelete} className="flex-1 px-4 py-2 rounded-full bg-[color:var(--wine)] text-[color:var(--cream)] text-sm">Excluir</button>
              <button onClick={() => setConfirmDelete(false)} className="flex-1 px-4 py-2 rounded-full glass border border-white/10 text-[color:var(--cream)]/80 text-sm">Cancelar</button>
            </div>
          </div>
        )}
      </div>

      <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between gap-2">
        <button onClick={() => setConfirmDelete(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[color:var(--cream)]/50 hover:text-[color:var(--wine)] text-xs transition">
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </button>
        {isPending && !askMoments && (
          <button onClick={() => setAskMoments(true)}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-[color:var(--burnt)] to-[color:var(--wine)] text-[color:var(--cream)] text-sm hover:scale-[1.03] transition">
            <Check className="h-3.5 w-3.5" /> Concluir desafio
          </button>
        )}
      </div>
    </Modal>
  );
}

function Modal({ onClose, title, eyebrow, children }: {
  onClose: () => void; title: string; eyebrow?: string; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="absolute inset-0 bg-[color:var(--ink)]/70 backdrop-blur-xl" />
      <div className="relative w-full sm:max-w-lg glass rounded-t-3xl sm:rounded-3xl border border-[color:var(--rose-antique)]/20 shadow-[0_30px_80px_-20px_oklch(0.10_0.05_18/0.9)] overflow-hidden animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-white/5 gap-3">
          <div className="min-w-0">
            {eyebrow && <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--rose-antique)] truncate">{eyebrow}</p>}
            <h2 className="font-display text-xl text-[color:var(--cream)] mt-0.5 truncate">{title}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 text-[color:var(--cream)]/70 shrink-0"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl px-4 py-3 border border-white/5">
      <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--rose-antique)] mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-xs tracking-wide transition-all ${
        active
          ? "bg-gradient-to-r from-[color:var(--burnt)] to-[color:var(--wine)] text-[color:var(--cream)]"
          : "glass border border-white/10 text-[color:var(--cream)]/70 hover:text-[color:var(--cream)]"
      }`}>
      {children}
    </button>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-xl px-3 py-2 border border-white/5">
      <p className="text-[9px] uppercase tracking-[0.25em] text-[color:var(--rose-antique)]">{label}</p>
      <p className="text-[color:var(--cream)]/85 mt-0.5">{children}</p>
    </div>
  );
}
