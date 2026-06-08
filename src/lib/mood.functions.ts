import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  person: z.enum(["vitoria", "eliel"]),
  mood: z.string().min(1).max(60),
  message: z.string().max(1000).optional().default(""),
});

export const sendMoodNotification = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return { ok: false, skipped: "no_api_key" as const };

    let to: string | undefined;
    let subject: string;
    let who: string;

    if (data.person === "vitoria") {
      to = process.env.ELIEL_NOTIFICATION_EMAIL || "elielximenesgarcia@hotmail.com";
      subject = "Humor do dia da Vitória";
      who = "Vitória";
    } else {
      to = process.env.VITORIA_NOTIFICATION_EMAIL || undefined;
      subject = "Humor do dia do Eliel";
      who = "Eliel";
      if (!to) return { ok: true, skipped: "no_recipient" as const };
    }

    const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const esc = (s: string) =>
      s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;background:#fff;color:#222">
        <h2 style="margin:0 0 16px;color:#7a2e2e">💗 Humor do dia — ${esc(who)}</h2>
        <p style="margin:6px 0"><strong>Humor:</strong> ${esc(data.mood)}</p>
        ${data.message ? `<p style="margin:14px 0 6px"><strong>Mensagem:</strong></p><p style="margin:0;white-space:pre-wrap;color:#444">${esc(data.message)}</p>` : ""}
        <hr style="margin:20px 0;border:none;border-top:1px solid #eee" />
        <p style="margin:0;font-size:12px;color:#888">Registrado em ${now}</p>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: "Nossa História <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Resend mood error", res.status, txt);
      return { ok: false, error: `status_${res.status}` as const };
    }
    return { ok: true };
  });
