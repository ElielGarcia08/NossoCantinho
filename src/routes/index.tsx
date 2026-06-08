import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, ArrowRight } from "lucide-react";
import { HeroCarousel } from "@/components/HeroCarousel";
import { usePlayer } from "@/components/MusicPlayer";
import { requireAuth } from "@/lib/auth-route";

export const Route = createFileRoute("/")({
  beforeLoad: requireAuth,
  component: Index,
  head: () => ({
    meta: [
      { title: "Nosso Universo ❤ — Pra você, com amor" },
      { name: "description", content: "Um lugar feito só pra nós dois. Entra comigo." },
    ],
  }),
});

function Index() {
  const player = usePlayer();
  const heroRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      setOffset({ x: (e.clientX - cx) / 60, y: (e.clientY - cy) / 60 });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <main className="relative z-10">
      {/* HERO */}
      <section
        ref={heroRef}
        className="relative min-h-[100svh] flex items-center px-4 sm:px-8 pt-28 pb-28 overflow-hidden"
      >
        {/* radial glow */}
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 h-[80vh] w-[80vh] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(closest-side, oklch(0.50 0.20 25 / 0.45), transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-6xl w-full grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Photo */}
          <div
            className="relative mx-auto w-full max-w-[420px] aspect-[4/5] animate-fade-up"
            style={{
              transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
              transition: "transform 0.3s ease-out",
            }}
          >
            <div
              className="absolute -inset-6 rounded-[2rem] opacity-80 blur-2xl"
              style={{
                background: "linear-gradient(135deg, oklch(0.55 0.22 25 / 0.6), oklch(0.30 0.14 18 / 0.5))",
              }}
            />
            <div className="relative h-full w-full rounded-[2rem] overflow-hidden ring-1 ring-[color:var(--rose-antique)]/30 shadow-[var(--shadow-soft)]">
              <HeroCarousel alt="Você, minha pessoa favorita" />
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(180deg, transparent 40%, oklch(0.10 0.04 18 / 0.65) 100%)",
                }}
              />
              <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--cream)]/80">
                  Minha pessoa favorita
                </span>
                <span className="text-[color:var(--rose-antique)]">♥</span>
              </div>
            </div>
          </div>

          {/* Text */}
          <div className="text-center lg:text-left animate-fade-up [animation-delay:200ms]">
            <p className="text-[10px] uppercase tracking-[0.5em] text-[color:var(--rose-antique)] mb-5">
              Feito com amor, por alguem que será para sempre seu.
            </p>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.05] text-balance">
              <span className="text-gradient-rose">Todo lugar fica</span>
              <br />
              <em className="not-italic text-[color:var(--cream)]">melhor quando</em>
              <br />
              <span className="text-gradient-rose">tem você.</span>
            </h1>
            <p className="mt-6 max-w-md mx-auto lg:mx-0 text-[color:var(--cream)]/70 leading-relaxed">
              Eu construí esse cantinho com paciência, café e muita saudade — unindo minha pessoa favorita ao meu novo
              hobbie favorito.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
              <Link
                to="/momentos"
                onClick={() => void player.unlock()}
                className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-br from-[color:var(--burnt)] to-[color:var(--wine)] text-[color:var(--cream)] glow-wine hover:scale-[1.03] hover:shadow-[0_0_80px_-10px_oklch(0.55_0.22_25/0.7)] transition-all duration-500"
              >
                <span>Entrar no nosso mundo</span>
                <span className="text-[color:var(--cream)]">❤</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <button
                onClick={() => void player.togglePlay()}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full glass hover:bg-[color:var(--burnt)]/20 transition"
              >
                {player.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                <span>{player.playing ? "Pausar nossa playlist" : "Tocar nossa playlist"}</span>
              </button>
            </div>

            <p className="mt-8 text-xs text-[color:var(--cream)]/40 italic">
              {player.current.title} — {player.current.artist}
            </p>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.4em] text-[color:var(--cream)]/40 animate-shimmer">
          deslize ↓
        </div>
      </section>

      {/* CHAPTERS */}
      <section className="relative px-4 sm:px-8 py-24 max-w-6xl mx-auto">
        <p className="text-center text-[10px] uppercase tracking-[0.4em] text-[color:var(--rose-antique)] mb-3">
          Capítulos do nosso livro
        </p>
        <h2 className="text-center font-display text-4xl sm:text-5xl text-gradient-rose mb-14 text-balance">
          Tudo que eu queria te dizer
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {chapters.map((c, i) => (
            <Link
              key={c.to}
              to={c.to}
              className="group relative glass rounded-3xl p-7 overflow-hidden hover:-translate-y-1 transition-all duration-500"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div
                className="absolute -top-20 -right-20 h-48 w-48 rounded-full blur-3xl opacity-0 group-hover:opacity-70 transition duration-700"
                style={{ background: "oklch(0.50 0.20 25 / 0.6)" }}
              />
              <div className="relative">
                <span className="text-3xl">{c.icon}</span>
                <h3 className="mt-4 font-display text-2xl text-[color:var(--cream)]">{c.title}</h3>
                <p className="mt-2 text-sm text-[color:var(--cream)]/60 leading-relaxed">{c.desc}</p>
                <div className="mt-5 inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[color:var(--rose-antique)]">
                  Abrir <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Closing line */}
      <section className="relative px-4 sm:px-8 py-28 text-center max-w-3xl mx-auto">
        <p className="font-display italic text-3xl sm:text-4xl leading-snug text-balance text-[color:var(--cream)]/90">
          "E se um dia o mundo apagar,
          <br />a gente acende de novo — juntos."
        </p>
        <p className="mt-6 text-[10px] uppercase tracking-[0.5em] text-[color:var(--rose-antique)]">
          Feliz Dia dos Namorados ❤
        </p>
      </section>
    </main>
  );
}

const chapters = [
  {
    to: "/momentos" as const,
    icon: "📸",
    title: "Nossos Momentos",
    desc: "A linha do tempo do nosso amor, frame por frame.",
  },
  {
    to: "/quiz" as const,
    icon: "💌",
    title: "Quiz de Perguntas",
    desc: "Será que você me conhece tanto quanto eu te conheço?",
  },
  { to: "/cartas" as const, icon: "✉️", title: "Cartas", desc: "Para te dedicar em dias da semana." },
  {
    to: "/dates" as const,
    icon: "🌹",
    title: "Ideias de Date",
    desc: "Pra gente nunca ficar sem desculpa pra se ver.",
  },
  {
    to: "/filmes" as const,
    icon: "🎞️",
    title: "Filmes & Livros",
    desc: "Histórias pra dividir no sofá ou debaixo do edredom.",
  },
  { to: "/humor" as const, icon: "🌙", title: "Para o Humor", desc: "Um abraço quando o dia teimar em ficar nublado." },
];
