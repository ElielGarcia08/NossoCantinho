import { redirect } from "@tanstack/react-router";
import { getCurrentUserFn } from "@/lib/auth.functions";

export async function requireAuth() {
  const user = await getCurrentUserFn();
  if (!user) {
    throw redirect({ to: "/login" });
  }

  return { user };
}
