import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { sendMoodNotification } from "@/lib/mood.functions";
import { requireAuth } from "@/lib/auth-route";

type Person = "vitoria" | "eliel";

type MoodEntry = {
  id: string;
  person: Person;
  mood: string;
  message: string | null;
  entry_date: string;
  created_at: string;
  updated_at: string;
};

const MOODS: Record<Person, string[]> = {
  vitoria: ["Irritada", "Triste", "Bom humor", "Cansada", "Introspectiva", "Ansiosa"],
  eliel: ["Irritado", "Triste", "Bom humor", "Cansado", "Introspectivo", "Ansioso"],
};

const NAMES: Record<Person, string> = { vitoria: "Vitória", eliel: "Eliel" };

function todayISO() {
  // YYYY-MM-DD in local time
  const d = new Date();
  const tz = d.getTimezoneOffset();
  return new Date(d.getTime() - tz * 60000).toISOString().slice(0, 10);
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  } catch {
    return iso;
  }
}

export const Route = createFileRoute("/humor")({
  beforeLoad: requireAuth,
  component: HumorPage,
});

function HumorPage() {
  const [tab, setTab] = useState<Person>("vitoria");
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const sendEmail = useServerFn(sendMoodNotification);

  useEffect(() => {
    const body = document.body;
    if (tab === "eliel") {
      body.classList.add("theme-eliel");
    } else {
      body.classList.remove("theme-eliel");
    }
    return () => body.classList.remove("theme-eliel");
  }, [tab]);

  const load = async () => {
    const { data, error } = await supabase
      .from("mood_entries")
      .select("*")
      .order("entry_date", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(50);
    if (!error && data) setEntries(data as MoodEntry[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const todayEntries = useMemo(() => {
    const today = todayISO();
    const map: Partial<Record<Person, MoodEntry>> = {};
    for (const e of entries) {
      if (e.entry_date === today && !map[e.person]) map[e.person] = e;
    }
    return map;
  }, [entries]);

  const otherPerson: Person = tab === "vitoria" ? "eliel" : "vitoria";
  const otherEntry = todayEntries[otherPerson];
  const myEntry = todayEntries[tab];

  const isVitoria = tab === "vitoria";

  // Palettes
  const palette = isVitoria
    ? {
        ring: "ring-[color:var(--rose-antique)]/40",
        accent: "var(--burnt)",
        accentText: "text-[color:var(--cream)]",
        chipActive: "bg-[color:var(--burnt)] text-[color:var(--cream)] glow-wine",
        glow: "shadow-[0_10px_40px_-15px_oklch(0.10_0.05_18/0.6)]",
        eyebrow: "text-[color:var(--rose-antique)]",
      }
    : {
        ring: "ring-sky-300/30",
        accent: "#1e3a8a",
        accentText: "text-white",
        chipActive: "bg-[#1e3a8a] text-white shadow-[0_0_24px_-6px_#3b82f6]",
        glow: "shadow-[0_10px_40px_-15px_rgba(30,58,138,0.55)]",
        eyebrow: "text-sky-300/80",
      };

  return (
    <PageShell eyebrow="Capítulo 05" title="Humor do Dia" subtitle="Conta pra mim como você tá hoje.">
      {/* Person tabs */}
      <div className="flex justify-center gap-2 mb-8">
        {(["vitoria", "eliel"] as Person[]).map((p) => {
          const active = p === tab;
          const isV = p === "vitoria";
          return (
            <button
              key={p}
              onClick={() => setTab(p)}
              className={`px-6 py-2.5 rounded-full text-sm tracking-wide transition ${
                active
                  ? isV
                    ? "bg-[color:var(--burnt)] text-[color:var(--cream)] glow-wine"
                    : "bg-[#1e3a8a] text-white shadow-[0_0_24px_-6px_#3b82f6]"
                  : "glass hover:bg-white/5"
              }`}
            >
              {NAMES[p]}
            </button>
          );
        })}
      </div>

      <div className="max-w-2xl mx-auto space-y-8">
        {/* Other person's card */}
        <div className={`glass rounded-3xl p-6 ring-1 ${palette.ring} ${palette.glow} animate-fade-up`}>
          <p className={`text-[10px] uppercase tracking-[0.4em] ${palette.eyebrow} mb-2`}>
            Humor {isVitoria ? "do Eliel" : "da Vitória"} hoje
          </p>
          {otherEntry ? (
            <>
              <p className="font-display text-3xl text-[color:var(--cream)] mb-2">{otherEntry.mood}</p>
              {otherEntry.message && (
                <p className="italic text-[color:var(--cream)]/80 mt-2 whitespace-pre-wrap">
                  "{otherEntry.message}"
                </p>
              )}
              <p className="mt-3 text-xs text-[color:var(--cream)]/50">
                Atualizado em {formatDateTime(otherEntry.updated_at)}
              </p>
            </>
          ) : (
            <p className="text-[color:var(--cream)]/60 italic">
              {loading ? "Carregando..." : "Ainda não registrado hoje 💭"}
            </p>
          )}
        </div>

        {/* My form */}
        <MoodForm
          person={tab}
          existing={myEntry}
          palette={palette}
          onSaved={async (saved) => {
            await load();
            try {
              await sendEmail({ data: { person: tab, mood: saved.mood, message: saved.message || "" } });
            } catch (err) {
              console.error("mood email failed", err);
            }
          }}
        />

        {/* Recent history */}
        <RecentHistory entries={entries.filter((e) => e.person === tab).slice(0, 5)} palette={palette} />
      </div>
    </PageShell>
  );
}

function MoodForm({
  person,
  existing,
  palette,
  onSaved,
}: {
  person: Person;
  existing?: MoodEntry;
  palette: { chipActive: string; eyebrow: string; ring: string; glow: string };
  onSaved: (saved: { mood: string; message: string }) => void | Promise<void>;
}) {
  const [mood, setMood] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setMood(existing?.mood ?? "");
    setMessage(existing?.message ?? "");
    setStatus(null);
  }, [existing?.id, person]);

  const submit = async () => {
    if (!mood) return;
    setSaving(true);
    setStatus(null);
    const payload = {
      person,
      mood,
      message: message.trim() || null,
      entry_date: todayISO(),
    };
    const { error } = await supabase
      .from("mood_entries")
      .upsert(payload, { onConflict: "person,entry_date" });
    setSaving(false);
    if (error) {
      setStatus("Não foi possível salvar. Tenta de novo.");
      return;
    }
    setStatus("Salvo com carinho ✨");
    await onSaved({ mood, message });
  };

  return (
    <div className={`glass rounded-3xl p-6 ring-1 ${palette.ring} ${palette.glow}`}>
      <p className={`text-[10px] uppercase tracking-[0.4em] ${palette.eyebrow} mb-4`}>
        Como você tá hoje?
      </p>
      <div className="flex flex-wrap gap-2 mb-6">
        {MOODS[person].map((m) => {
          const active = mood === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMood(m)}
              className={`px-4 py-2 rounded-full text-sm transition ${
                active ? palette.chipActive : "glass hover:bg-white/5"
              }`}
            >
              {m}
            </button>
          );
        })}
      </div>

      <label className="block text-xs uppercase tracking-[0.3em] text-[color:var(--cream)]/60 mb-2">
        Quer deixar uma mensagem?
      </label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder="Opcional — algo curtinho que você queira contar"
        className="w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 text-sm text-[color:var(--cream)] placeholder:text-[color:var(--cream)]/40 focus:outline-none focus:ring-1 focus:ring-[color:var(--rose-antique)]/40"
      />

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-[color:var(--cream)]/50">
          {existing ? "Você já registrou hoje — pode atualizar." : "Ainda sem registro hoje."}
        </p>
        <button
          type="button"
          onClick={submit}
          disabled={!mood || saving}
          className={`px-5 py-2.5 rounded-full text-sm transition ${
            mood
              ? palette.chipActive
              : "glass opacity-50 cursor-not-allowed"
          }`}
        >
          {saving ? "Salvando..." : existing ? "Atualizar" : "Registrar"}
        </button>
      </div>
      {status && <p className="mt-3 text-xs text-[color:var(--cream)]/70">{status}</p>}
    </div>
  );
}

function RecentHistory({
  entries,
  palette,
}: {
  entries: MoodEntry[];
  palette: { eyebrow: string };
}) {
  if (entries.length === 0) return null;
  return (
    <div>
      <p className={`text-[10px] uppercase tracking-[0.4em] ${palette.eyebrow} mb-3 text-center`}>
        Últimos registros
      </p>
      <ul className="space-y-2">
        {entries.map((e) => (
          <li key={e.id} className="glass rounded-2xl px-4 py-3 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-[color:var(--cream)]">{e.mood}</p>
              {e.message && (
                <p className="text-xs italic text-[color:var(--cream)]/60 mt-1 whitespace-pre-wrap">
                  "{e.message}"
                </p>
              )}
            </div>
            <p className="text-[11px] text-[color:var(--cream)]/50 whitespace-nowrap">
              {new Date(e.entry_date + "T00:00:00").toLocaleDateString("pt-BR")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
