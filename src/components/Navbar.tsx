import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { LogOut, Menu, X, Heart } from "lucide-react";
import { logoutFn } from "@/lib/auth.functions";

const links = [
  { to: "/momentos", label: "Nossos Momentos" },
  { to: "/quiz", label: "Desafios" },
  { to: "/cartas", label: "Cartas" },
  { to: "/dates", label: "Ideias de Date" },
  { to: "/filmes", label: "Filmes & Séries" },
  { to: "/clube-do-livro", label: "Clube do Livro" },
  { to: "/humor", label: "Humor do Dia" },
  { to: "/wishlist", label: "Wishlist" },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { location } = useRouterState();
  const router = useRouter();
  const logout = useServerFn(logoutFn);

  const signOut = async () => {
    await logout();
    await router.invalidate();
    await router.navigate({ to: "/" });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40">
      <div className="mx-auto mt-3 sm:mt-5 max-w-7xl px-3 sm:px-6">
        <nav className="glass rounded-full px-4 sm:px-6 py-3 flex items-center justify-between shadow-[0_10px_40px_-15px_oklch(0.10_0.05_18/0.8)]">
          <Link to="/" className="flex items-center gap-2 font-display text-lg tracking-wide">
            <Heart className="h-4 w-4 fill-[color:var(--burnt)] text-[color:var(--burnt)]" />
            <span className="text-gradient-rose">Nosso Universo</span>
          </Link>

          <ul className="hidden lg:flex items-center gap-1">
            {links.map((l) => {
              const active = location.pathname === l.to;
              return (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className={`relative px-3 py-2 text-[13px] tracking-wide rounded-full transition-all duration-300 ${
                      active
                        ? "text-[color:var(--cream)]"
                        : "text-[color:var(--cream)]/70 hover:text-[color:var(--cream)]"
                    }`}
                  >
                    {l.label}
                    {active && (
                      <span className="absolute inset-0 -z-10 rounded-full bg-[color:var(--burnt)]/25 ring-1 ring-[color:var(--rose-antique)]/30" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          <button
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden p-2 rounded-full hover:bg-white/5 transition"
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <button
            onClick={() => void signOut()}
            className="hidden lg:grid h-9 w-9 place-items-center rounded-full hover:bg-[color:var(--burnt)]/20 text-[color:var(--cream)]/70 hover:text-[color:var(--cream)] transition"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </nav>

        {open && (
          <div className="lg:hidden mt-2 glass rounded-3xl p-3 animate-fade-up">
            <ul className="flex flex-col">
              {links.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 text-sm rounded-2xl hover:bg-[color:var(--burnt)]/20 transition"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <button
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
              className="mt-1 flex w-full items-center gap-2 px-4 py-3 text-sm rounded-2xl hover:bg-[color:var(--burnt)]/20 transition"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
