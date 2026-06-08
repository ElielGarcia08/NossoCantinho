import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Navbar } from "@/components/Navbar";
import { MusicPlayerProvider } from "@/components/MusicPlayer";
import { FloatingHearts } from "@/components/FloatingHearts";
import { MusicRequestButton } from "@/components/MusicRequestButton";

function NotFoundComponent() {
  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass rounded-3xl p-10">
        <h1 className="font-display text-6xl text-gradient-rose">404</h1>
        <p className="mt-3 text-[color:var(--cream)]/70">Esse cantinho ainda não existe.</p>
        <a href="/" className="mt-6 inline-block px-5 py-2 rounded-full bg-[color:var(--burnt)] text-[color:var(--cream)]">
          Voltar pra casa
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass rounded-3xl p-10">
        <h1 className="font-display text-3xl text-gradient-rose">Algo se perdeu no caminho</h1>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 px-5 py-2 rounded-full bg-[color:var(--burnt)] text-[color:var(--cream)]"
        >
          Tentar de novo
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Nosso Universo ❤ — Um presente pra você" },
      { name: "description", content: "Um cantinho cinematográfico só nosso. Feito com amor pro Dia dos Namorados." },
      { name: "theme-color", content: "#2a0a10" },
      { property: "og:title", content: "Nosso Universo ❤" },
      { property: "og:description", content: "Um presente romântico e cinematográfico, só nosso." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500;600&family=Caveat:wght@400;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { location } = useRouterState();
  const isLoginPage = location.pathname === "/login";

  return (
    <QueryClientProvider client={queryClient}>
      <MusicPlayerProvider>
        <FloatingHearts />
        {!isLoginPage && <Navbar />}
        <Outlet />
        {!isLoginPage && <MusicRequestButton />}
      </MusicPlayerProvider>
    </QueryClientProvider>
  );
}
