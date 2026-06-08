import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Loader2, LockKeyhole, Mail } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getCurrentUserFn, loginFn } from "@/lib/auth.functions";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const user = await getCurrentUserFn();
    if (user) throw redirect({ to: "/momentos" });
  },
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Entrar | Nosso Universo" },
      { name: "description", content: "Um cantinho protegido para o nosso universo." },
    ],
  }),
});

function LoginPage() {
  const router = useRouter();
  const login = useServerFn(loginFn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await login({ data: { email, password } });
      if (!result.ok) {
        setError(result.message);
        return;
      }

      await router.invalidate();
      await router.navigate({ to: "/momentos" });
    } catch (err) {
      console.error(err);
      setError("Nao consegui entrar agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative z-10 min-h-[100svh] grid place-items-center px-4 py-10">
      <section className="w-full max-w-md glass rounded-3xl border border-[color:var(--rose-antique)]/25 p-6 sm:p-8 shadow-[0_30px_80px_-30px_oklch(0.10_0.05_18/0.95)]">
        <div className="mx-auto h-12 w-12 rounded-full bg-[color:var(--burnt)]/25 ring-1 ring-[color:var(--rose-antique)]/30 grid place-items-center">
          <Heart className="h-5 w-5 fill-[color:var(--burnt)] text-[color:var(--rose-antique)]" />
        </div>

        <div className="mt-6 text-center">
          <p className="text-[10px] uppercase tracking-[0.45em] text-[color:var(--rose-antique)]">Nosso cantinho</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl text-gradient-rose">Entrar</h1>
          <p className="mt-3 text-sm leading-relaxed text-[color:var(--cream)]/65">
            Um acesso pequeno para manter nossas lembrancas protegidas.
          </p>
        </div>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block">
            <span className="text-xs text-[color:var(--cream)]/70">E-mail</span>
            <span className="mt-1.5 flex items-center gap-2 rounded-2xl bg-black/30 border border-[color:var(--rose-antique)]/20 px-3 py-3 focus-within:border-[color:var(--rose-antique)]/70">
              <Mail className="h-4 w-4 text-[color:var(--rose-antique)]/80" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="w-full bg-transparent text-sm text-[color:var(--cream)] outline-none"
              />
            </span>
          </label>

          <label className="block">
            <span className="text-xs text-[color:var(--cream)]/70">Senha</span>
            <span className="mt-1.5 flex items-center gap-2 rounded-2xl bg-black/30 border border-[color:var(--rose-antique)]/20 px-3 py-3 focus-within:border-[color:var(--rose-antique)]/70">
              <LockKeyhole className="h-4 w-4 text-[color:var(--rose-antique)]/80" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-transparent text-sm text-[color:var(--cream)] outline-none"
              />
            </span>
          </label>

          {error && <p className="text-sm text-red-200">{error}</p>}

          <button
            type="submit"
            disabled={loading || !email.trim() || !password}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[color:var(--burnt)] to-[color:var(--wine)] px-5 py-3 text-sm font-medium text-[color:var(--cream)] glow-wine hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100 transition"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
            <span>{loading ? "Entrando..." : "Entrar no nosso mundo"}</span>
          </button>
        </form>
      </section>
    </main>
  );
}
