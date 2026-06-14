import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";

const SESSION_NAME = "nosso-cantinho-session";
const DEV_SESSION_SECRET = "dev-only-nosso-cantinho-session-secret-please-set-env";

type SessionData = {
  email?: string;
};

type AuthUser = {
  email: string;
  password: string;
};

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;

  if (process.env.NODE_ENV !== "production") return DEV_SESSION_SECRET;

  throw new Error("SESSION_SECRET precisa ter pelo menos 32 caracteres.");
}

function useAppSession() {
  return useSession<SessionData>({
    name: SESSION_NAME,
    password: getSessionSecret(),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  });
}

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

function getConfiguredUsers(): AuthUser[] {
  const users: Array<{ email?: string; password?: string }> = [
    { email: process.env.AUTH_EMAIL, password: process.env.AUTH_PASSWORD },
    { email: process.env.VITORIA_AUTH_EMAIL, password: process.env.VITORIA_AUTH_PASSWORD },
    { email: process.env.AUTH_EMAIL_VITORIA, password: process.env.AUTH_PASSWORD_VITORIA },
    { email: process.env.VITORIA_EMAIL, password: process.env.VITORIA_PASSWORD },
    { email: process.env.AUTH_EMAIL_2, password: process.env.AUTH_PASSWORD_2 },
  ];

  return users
    .filter((user): user is AuthUser => Boolean(user.email && user.password))
    .map((user) => ({ email: user.email.trim().toLowerCase(), password: user.password }));
}

export const loginFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => loginSchema.parse(data))
  .handler(async ({ data }) => {
    const users = getConfiguredUsers();

    if (users.length === 0) {
      return { ok: false as const, message: "Login nao configurado no servidor." };
    }

    const email = data.email.trim().toLowerCase();
    const user = users.find((candidate) => candidate.email === email && candidate.password === data.password);
    if (!user) {
      return { ok: false as const, message: "E-mail ou senha incorretos." };
    }

    const session = await useAppSession();
    await session.update({ email });

    return { ok: true as const, email };
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useAppSession();
  await session.clear();
  return { ok: true as const };
});

export const getCurrentUserFn = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useAppSession();
  if (!session.data.email) return null;

  return { email: session.data.email };
});
