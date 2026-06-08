import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/auth-route";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Mail, Plus, X, Loader2, Send, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import cartasBg from "@/assets/cartas-bg-custom.png";
import { sendLetterNotification } from "@/lib/letter.functions";
import { supabase } from "@/integrations/supabase/client";

type Person = "Eliel" | "Vitória";
type Status = "lida" | "não lida";

type Letter = {
  id: string;
  remetente: Person;
  destinatario: Person;
  titulo: string;
  mensagem: string;
  data: string;
  status: Status;
  created_at: string;
};

const sb = supabase.from("letters" as never) as any;

const envelopeColor = (p: Person) =>
  p === "Eliel"
    ? { bg: "linear-gradient(135deg, #6c93c4, #4a78b5)", flap: "#5887bf", accent: "#3a679f" }
    : { bg: "linear-gradient(135deg, #d97a78, #c25756)", flap: "#cf6766", accent: "#a44342" };

/* ───────── Send Modal + Animation ───────── */
function SendLetterModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [remetente, setRemetente] = useState<Person>("Eliel");
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [data, setData] = useState(today);
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState<"form" | "anim" | "done">("form");
  const sendEmail = useServerFn(sendLetterNotification);

  const destinatario: Person = remetente === "Eliel" ? "Vitória" : "Eliel";
  const colors = envelopeColor(remetente);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !mensagem.trim() || saving) return;
    setSaving(true);
    setPhase("anim");
    const { error } = await sb.insert({
      remetente,
      destinatario,
      titulo: titulo.trim(),
      mensagem: mensagem.trim(),
      data,
      status: "não lida",
    });
    if (error) {
      alert("Erro ao enviar: " + error.message);
      setSaving(false);
      setPhase("form");
      return;
    }
    try {
      await sendEmail({
        data: {
          remetente,
          destinatario,
          titulo: titulo.trim(),
          mensagem: mensagem.trim(),
          data,
        },
      });
    } catch (err) {
      console.error("letter email failed", err);
    }
    // wait for animation to finish
    setTimeout(() => {
      setPhase("done");
      setTimeout(() => {
        onSent();
        onClose();
      }, 1400);
    }, 3200);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      {phase === "form" && (
        <div className="relative w-full max-w-lg rounded-3xl bg-[color:var(--ink)]/95 border border-[color:var(--cream)]/15 p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
          <h3 className="font-display text-2xl text-gradient-rose mb-5">Enviar Carta</h3>
          <form onSubmit={submit} className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--cream)]/60">Remetente</span>
                <select value={remetente} onChange={(e) => setRemetente(e.target.value as Person)}
                  className="w-full rounded-xl bg-[color:var(--ink)] border border-[color:var(--cream)]/15 px-3 py-2 text-[color:var(--cream)] outline-none">
                  <option>Eliel</option>
                  <option>Vitória</option>
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--cream)]/60">Destinatário</span>
                <input value={destinatario} disabled
                  className="w-full rounded-xl bg-[color:var(--ink)]/60 border border-[color:var(--cream)]/10 px-3 py-2 text-[color:var(--cream)]/70 outline-none" />
              </label>
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--cream)]/60">Título</span>
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} required
                className="w-full rounded-xl bg-[color:var(--ink)] border border-[color:var(--cream)]/15 px-3 py-2 text-[color:var(--cream)] outline-none" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--cream)]/60">Data</span>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} required
                className="w-full rounded-xl bg-[color:var(--ink)] border border-[color:var(--cream)]/15 px-3 py-2 text-[color:var(--cream)] outline-none" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--cream)]/60">Mensagem</span>
              <textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} required rows={8} maxLength={5000}
                className="w-full rounded-xl bg-[color:var(--ink)] border border-[color:var(--cream)]/15 px-3 py-2 text-[color:var(--cream)] outline-none resize-y font-display italic" />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-full border border-[color:var(--cream)]/15 text-sm">Cancelar</button>
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-[color:var(--burnt)] to-[color:var(--wine)] text-[color:var(--cream)] text-sm font-medium disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar Carta
              </button>
            </div>
          </form>
        </div>
      )}

      {phase === "anim" && (
        <div className="relative w-full max-w-md aspect-[4/3] flex items-center justify-center">
          <style>{`
            @keyframes paper-fold {
              0% { transform: translateY(-40px) scale(1) rotateX(0deg); opacity: 0; }
              15% { transform: translateY(0) scale(1) rotateX(0deg); opacity: 1; }
              45% { transform: translateY(0) scale(1) rotateX(0deg); opacity: 1; }
              65% { transform: translateY(20px) scale(0.6) rotateX(70deg); opacity: 1; }
              80% { transform: translateY(60px) scale(0.4) rotateX(70deg); opacity: 0.4; }
              100% { transform: translateY(80px) scale(0.3) rotateX(70deg); opacity: 0; }
            }
            @keyframes envelope-in {
              0%, 50% { transform: translateX(-50%) translateY(40px) scale(0.9); opacity: 0; }
              70% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
              100% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
            }
            @keyframes flap-close {
              0%, 70% { transform: rotateX(180deg); }
              85%, 100% { transform: rotateX(0deg); }
            }
            @keyframes envelope-fly {
              0%, 85% { transform: translateX(-50%) translateY(0) rotate(0deg); }
              100% { transform: translateX(200%) translateY(-200px) rotate(20deg); }
            }
          `}</style>
          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-44 h-56 rounded-sm shadow-2xl"
            style={{
              background: "linear-gradient(180deg, #f8f1e3, #efe4cc)",
              animation: "paper-fold 3s ease-in-out forwards",
              transformOrigin: "center bottom",
              backgroundImage: "repeating-linear-gradient(180deg, transparent 0 22px, rgba(120,90,60,0.18) 22px 23px)",
            }}>
            <div className="p-3 font-display italic text-xs text-[#5a4530]/80">Querida(o)...</div>
          </div>

          <div
            className="absolute left-1/2 bottom-10 w-64 h-40"
            style={{ animation: "envelope-in 3.2s ease-in-out forwards, envelope-fly 1.4s ease-in 3.2s forwards" }}
          >
            <div className="absolute inset-0 rounded-md shadow-2xl" style={{ background: colors.bg }} />
            <div className="absolute inset-x-0 top-0 h-1/2 origin-top"
              style={{
                background: colors.flap,
                clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                animation: "flap-close 3.2s ease-in-out forwards",
              }} />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
              style={{ background: colors.accent }} />
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="text-center animate-fade-in">
          <p className="font-display text-3xl text-gradient-rose">Carta enviada com carinho ❤️</p>
        </div>
      )}
    </div>,
    document.body
  );
}

/* ───────── Read Letter Modal ───────── */
function ReadLetterModal({ letter, onClose }: { letter: Letter; onClose: () => void }) {
  const wasUnread = letter.status === "não lida";

  const handleClose = async () => {
    if (wasUnread) {
      await sb.update({ status: "lida" }).eq("id", letter.id);
    }
    onClose();
  };

  const LINE_H = 36;
  const PAD_TOP = 56; // px — must be multiple of LINE_H for alignment baseline

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
      onClick={handleClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-sm animate-scale-in"
        style={{
          background: "#f7f0e4",
          // background-attachment: local makes the gradients scroll with the content,
          // so the ruled lines stay locked to the text baselines.
          backgroundImage: [
            `repeating-linear-gradient(180deg, transparent 0 ${LINE_H - 1}px, rgba(120,90,60,0.22) ${LINE_H - 1}px ${LINE_H}px)`,
            "radial-gradient(ellipse at top left, rgba(160,120,80,0.18), transparent 60%)",
            "radial-gradient(ellipse at bottom right, rgba(120,80,50,0.22), transparent 65%)",
          ].join(", "),
          backgroundAttachment: "local, local, local",
          backgroundPosition: `0 ${PAD_TOP}px, 0 0, 0 0`,
          backgroundRepeat: "repeat, no-repeat, no-repeat",
          border: "1px solid rgba(90,60,40,0.35)",
          boxShadow: "0 40px 80px -20px rgba(0,0,0,0.7), 0 10px 30px -10px rgba(0,0,0,0.5), inset 0 0 60px rgba(120,80,40,0.18), inset 0 0 0 1px rgba(255,255,255,0.4)",
          paddingLeft: "clamp(2rem, 6vw, 3.5rem)",
          paddingRight: "clamp(2rem, 6vw, 3.5rem)",
          paddingTop: `${PAD_TOP}px`,
          paddingBottom: `${PAD_TOP}px`,
        }}>
        <button onClick={handleClose}
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-black/10 text-[#5a4530] z-10">
          <X className="h-4 w-4" />
        </button>
        <div className="text-[#3a2c22]" style={{ lineHeight: `${LINE_H}px` }}>
          <div className="flex justify-between text-xs uppercase tracking-[0.25em] opacity-70" style={{ lineHeight: `${LINE_H}px` }}>
            <span>De: {letter.remetente}</span>
            <span>{new Date(letter.data).toLocaleDateString("pt-BR")}</span>
          </div>
          <p className="text-xs uppercase tracking-[0.25em] opacity-70" style={{ lineHeight: `${LINE_H}px` }}>Para: {letter.destinatario}</p>
          <h2 className="font-display text-[#3a2c22]" style={{ fontSize: "1.875rem", lineHeight: `${LINE_H * 2}px`, margin: `${LINE_H}px 0` }}>{letter.titulo}</h2>
          <p className="whitespace-pre-wrap font-display italic text-[#3a2c22]"
            style={{ fontSize: "1.0625rem", lineHeight: `${LINE_H}px` }}>
            {letter.mensagem}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ───────── Envelope Card ───────── */
function EnvelopeCard({ letter, onOpen, onDelete }: { letter: Letter; onOpen: () => void; onDelete: () => void }) {
  const colors = envelopeColor(letter.remetente);
  const unread = letter.status === "não lida";

  // Short preview of the message for hover state (2–3 short lines)
  const preview = letter.mensagem.split(/\n+/).join(" ").slice(0, 140).trim();

  return (
    <div
      className="envelope-card group relative w-full aspect-[5/3] text-left"
      style={{ perspective: "1200px" }}>
      <style>{`
        .envelope-card .env-body { transition: transform 600ms cubic-bezier(.22,.61,.36,1), box-shadow 600ms; }
        .envelope-card:hover .env-body { transform: translateY(-6px); box-shadow: 0 24px 50px -14px rgba(0,0,0,0.6); }
        .envelope-card .env-flap {
          transition: transform 650ms cubic-bezier(.22,.61,.36,1);
          transform-origin: top center;
          transform: rotateX(0deg);
        }
        .envelope-card:hover .env-flap { transform: rotateX(180deg); }
        .envelope-card .env-paper {
          transition: transform 650ms cubic-bezier(.22,.61,.36,1), opacity 300ms ease 120ms;
          transform: translateY(18%);
          opacity: 0;
        }
        .envelope-card:hover .env-paper { transform: translateY(-12%); opacity: 1; }
        .envelope-card .env-seal {
          transition: opacity 300ms ease, transform 500ms ease;
        }
        .envelope-card:hover .env-seal { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
        @media (hover: none) {
          .envelope-card:hover .env-flap { transform: rotateX(0deg); }
          .envelope-card:hover .env-paper { transform: translateY(18%); opacity: 0; }
          .envelope-card:hover .env-body { transform: none; }
          .envelope-card:hover .env-seal { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>

      {/* Outer container with envelope body */}
      <button onClick={onOpen}
        className="env-body relative block w-full h-full rounded-md overflow-hidden text-left"
        style={{
          background: colors.bg,
          backgroundImage: `${colors.bg}, radial-gradient(ellipse at top, rgba(255,255,255,0.12), transparent 60%), radial-gradient(ellipse at bottom, rgba(0,0,0,0.18), transparent 60%)`,
          boxShadow: "0 14px 30px -12px rgba(0,0,0,0.55), inset 0 0 30px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.12)",
        }}>

        {/* Aged paper tucked inside; peeks out on hover */}
        <div className="env-paper absolute left-[12%] right-[12%] top-[30%] h-[42%] rounded-[2px] overflow-hidden z-[4] pointer-events-none"
          style={{
            background: "#f6ecd4",
            backgroundImage: [
              "repeating-linear-gradient(180deg, transparent 0 15px, rgba(120,90,60,0.18) 15px 16px)",
              "radial-gradient(ellipse at top left, rgba(160,120,80,0.15), transparent 60%)",
              "radial-gradient(ellipse at bottom right, rgba(120,80,50,0.18), transparent 60%)",
              "linear-gradient(180deg, #f7eed8 0%, #efe1c2 100%)",
            ].join(", "),
            boxShadow: "0 -3px 8px rgba(0,0,0,0.25), inset 0 0 14px rgba(120,80,40,0.15), inset 0 0 0 1px rgba(255,255,255,0.55)",
          }}>
          <div className="px-3 pt-3 pb-2">
            <p className="font-display italic text-[11px] leading-[15px] text-[#5a4530] line-clamp-2">
              {preview || "Querida(o)..."}
            </p>
          </div>
        </div>

        {/* Bottom triangular fold (envelope back lines) */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 z-[6] pointer-events-none"
          style={{
            background: `linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.06) 100%)`,
            clipPath: "polygon(0 100%, 50% 0, 100% 100%)",
            opacity: 0.35,
          }}
        />
        {/* Side triangular folds */}
        <div className="absolute inset-y-0 left-0 w-1/2 z-[6] pointer-events-none"
          style={{
            background: "linear-gradient(90deg, rgba(0,0,0,0.18), transparent 60%)",
            clipPath: "polygon(0 0, 0 100%, 100% 50%)",
            opacity: 0.5,
          }}
        />
        <div className="absolute inset-y-0 right-0 w-1/2 z-[6] pointer-events-none"
          style={{
            background: "linear-gradient(270deg, rgba(0,0,0,0.18), transparent 60%)",
            clipPath: "polygon(100% 0, 100% 100%, 0 50%)",
            opacity: 0.5,
          }}
        />

        {/* Top triangular flap (animates open on hover) */}
        <div className="env-flap absolute inset-x-0 top-0 h-[58%] z-[10]"
          style={{
            background: `linear-gradient(160deg, ${colors.flap} 0%, ${colors.accent} 100%)`,
            clipPath: "polygon(0 0, 100% 0, 50% 100%)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.22)",
          }}
        />

        {/* Wax seal — only visible when closed */}
        <div className="env-seal absolute left-1/2 top-[45%] w-5 h-5 rounded-full z-[11] pointer-events-none"
          style={{
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle at 35% 30%, #f0d6a0, ${colors.accent} 60%, #4a1f1f 100%)`,
            boxShadow: "0 2px 4px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.4)",
          }}
        />

        {/* Footer info */}
        <div className="absolute inset-x-0 bottom-0 p-3 z-[12] bg-gradient-to-t from-black/55 via-black/25 to-transparent text-[color:var(--cream)]">
          <p className="text-[10px] uppercase tracking-[0.25em] opacity-90">
            {letter.remetente} → {letter.destinatario} · {new Date(letter.data).toLocaleDateString("pt-BR")}
          </p>
          <p className="font-display text-lg leading-tight truncate">{letter.titulo}</p>
        </div>

        {unread && (
          <span className="absolute top-2 right-2 z-[20] text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full bg-white/90 text-[#a44342] font-semibold shadow">
            Nova
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-2 left-2 z-[30] grid h-8 w-8 place-items-center rounded-full bg-black/45 text-white/75 opacity-100 shadow-lg backdrop-blur transition hover:bg-[color:var(--wine)]/85 hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
        aria-label="Excluir carta"
        title="Excluir carta"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}


/* ───────── Page ───────── */
function CartasPage() {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"nao_lidas" | "lidas">("nao_lidas");
  const [showSend, setShowSend] = useState(false);
  const [reading, setReading] = useState<Letter | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await sb.select("*").order("created_at", { ascending: false });
    if (!error) setLetters((data ?? []) as Letter[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const deleteLetter = async (letter: Letter) => {
    const ok = window.confirm(`Excluir a carta "${letter.titulo}"?`);
    if (!ok) return;

    const { error } = await sb.delete().eq("id", letter.id);
    if (error) {
      alert("Erro ao excluir: " + error.message);
      return;
    }

    setLetters((prev) => prev.filter((item) => item.id !== letter.id));
    if (reading?.id === letter.id) setReading(null);
  };

  const stats = useMemo(() => {
    const calc = (p: Person) => ({
      enviadas: letters.filter((l) => l.remetente === p).length,
      lidas: letters.filter((l) => l.destinatario === p && l.status === "lida").length,
      naoLidas: letters.filter((l) => l.destinatario === p && l.status === "não lida").length,
    });
    return { eliel: calc("Eliel"), vitoria: calc("Vitória") };
  }, [letters]);

  const filtered = useMemo(() => {
    if (tab === "lidas") return letters.filter((l) => l.status === "lida");
    return letters.filter((l) => l.status === "não lida");
  }, [letters, tab]);

  return (
    <>
      {/* Background — full Ghibli scene with blurred extension */}
      <div aria-hidden className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[color:var(--ink)]">
        <img src={cartasBg} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover blur-3xl opacity-80" />
        <img src={cartasBg} alt="" className="absolute inset-0 h-full w-full object-contain" />
      </div>
      <div aria-hidden className="fixed inset-0 z-0 pointer-events-none" style={{ background: "rgba(0,0,0,0.32)" }} />

      <main className="relative z-10 min-h-screen px-4 sm:px-8 pt-32 pb-40 max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto animate-fade-up">
          <p className="text-[10px] uppercase tracking-[0.4em] text-[color:var(--rose-antique)] mb-4">Capítulo 02</p>
          <h1 className="font-display text-5xl sm:text-7xl text-balance text-gradient-rose">Cartas</h1>
          <p className="mt-6 text-base sm:text-lg text-[color:var(--cream)]/80 text-balance">
            Para te dedicar em dias da semana
          </p>
        </div>

        {/* Stat cards */}
        <div className="mt-12 grid sm:grid-cols-2 gap-5">
          <div className="rounded-2xl p-5 border backdrop-blur-xl"
            style={{ background: "linear-gradient(135deg, rgba(40,70,120,0.85), rgba(20,40,80,0.85))", borderColor: "rgba(160,190,230,0.3)" }}>
            <p className="text-xs uppercase tracking-[0.3em] text-blue-100/80">Eliel</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div><p className="font-display text-3xl text-white">{stats.eliel.enviadas}</p><p className="text-[10px] uppercase tracking-wider text-blue-100/70 mt-1">Enviadas</p></div>
              <div><p className="font-display text-3xl text-white">{stats.eliel.lidas}</p><p className="text-[10px] uppercase tracking-wider text-blue-100/70 mt-1">Lidas</p></div>
              <div><p className="font-display text-3xl text-white">{stats.eliel.naoLidas}</p><p className="text-[10px] uppercase tracking-wider text-blue-100/70 mt-1">Não lidas</p></div>
            </div>
          </div>
          <div className="rounded-2xl p-5 border backdrop-blur-xl"
            style={{ background: "linear-gradient(135deg, rgba(150,50,55,0.85), rgba(100,30,35,0.85))", borderColor: "rgba(240,180,180,0.3)" }}>
            <p className="text-xs uppercase tracking-[0.3em] text-rose-100/80">Vitória</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div><p className="font-display text-3xl text-white">{stats.vitoria.enviadas}</p><p className="text-[10px] uppercase tracking-wider text-rose-100/70 mt-1">Enviadas</p></div>
              <div><p className="font-display text-3xl text-white">{stats.vitoria.lidas}</p><p className="text-[10px] uppercase tracking-wider text-rose-100/70 mt-1">Lidas</p></div>
              <div><p className="font-display text-3xl text-white">{stats.vitoria.naoLidas}</p><p className="text-[10px] uppercase tracking-wider text-rose-100/70 mt-1">Não lidas</p></div>
            </div>
          </div>
        </div>

        {/* Action + Tabs */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button onClick={() => setTab("nao_lidas")}
              className={`px-4 py-2 rounded-full text-sm transition ${tab === "nao_lidas" ? "bg-[color:var(--burnt)]/80 text-white" : "bg-[color:var(--ink)]/55 text-[color:var(--cream)]/70 backdrop-blur-xl border border-white/10"}`}>
              Não lidas
            </button>
            <button onClick={() => setTab("lidas")}
              className={`px-4 py-2 rounded-full text-sm transition ${tab === "lidas" ? "bg-[color:var(--burnt)]/80 text-white" : "bg-[color:var(--ink)]/55 text-[color:var(--cream)]/70 backdrop-blur-xl border border-white/10"}`}>
              Lidas
            </button>
          </div>
          <button onClick={() => setShowSend(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[color:var(--burnt)] to-[color:var(--wine)] text-[color:var(--cream)] text-sm font-medium shadow-[0_10px_40px_-10px_oklch(0.55_0.18_25/0.7)]">
            <Mail className="h-4 w-4" /> Enviar Carta
          </button>
        </div>

        {/* List */}
        <div className="mt-8">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-[color:var(--cream)]/60" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-[color:var(--cream)]/70">
              <Mail className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-display text-xl">{tab === "lidas" ? "Nenhuma carta lida ainda." : "Nenhuma carta nova por aqui."}</p>
              <p className="text-sm mt-2 opacity-70">Escreva a primeira clicando em “Enviar Carta”.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((l) => (
                <EnvelopeCard key={l.id} letter={l} onOpen={() => setReading(l)} onDelete={() => deleteLetter(l)} />
              ))}
            </div>
          )}
        </div>
      </main>

      {showSend && <SendLetterModal onClose={() => setShowSend(false)} onSent={load} />}
      {reading && <ReadLetterModal letter={reading} onClose={() => { setReading(null); load(); }} />}
    </>
  );
}

export const Route = createFileRoute("/cartas")({ beforeLoad: requireAuth, component: CartasPage });
