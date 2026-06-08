import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";

const SESSION_NAME = "nosso-cantinho-session";
const DEV_SESSION_SECRET = "dev-only-nosso-cantinho-session-secret-please-set-env";

type SessionData = {
  email?: string;
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

export const loginFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => loginSchema.parse(data))
  .handler(async ({ data }) => {
    const expectedEmail = process.env.AUTH_EMAIL?.trim().toLowerCase();
    const expectedPassword = process.env.AUTH_PASSWORD;

    if (!expectedEmail || !expectedPassword) {
      return { ok: false as const, message: "Login nao configurado no servidor." };
    }

    const email = data.email.trim().toLowerCase();
    if (email !== expectedEmail || data.password !== expectedPassword) {
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
