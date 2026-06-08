import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  remetente: z.enum(["Eliel", "Vitória"]),
  destinatario: z.enum(["Eliel", "Vitória"]),
  titulo: z.string().trim().min(1).max(120),
  mensagem: z.string().trim().min(1).max(5000),
  data: z.string().trim().min(1).max(20),
});

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export const sendLetterNotification = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    if (data.remetente !== "Vitória" || data.destinatario !== "Eliel") {
      return { ok: true, skipped: "not_eliel_recipient" as const };
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return { ok: false, skipped: "no_api_key" as const };

    const to = process.env.ELIEL_NOTIFICATION_EMAIL || "elielximenesgarcia@hotmail.com";
    const when = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;background:#fff;color:#222">
        <h2 style="margin:0 0 16px;color:#7a2e2e">💌 Nova carta da Vitória</h2>
        <p style="margin:6px 0"><strong>Título:</strong> ${esc(data.titulo)}</p>
        <p style="margin:6px 0"><strong>Data da carta:</strong> ${esc(data.data)}</p>
        <p style="margin:14px 0 6px"><strong>Mensagem:</strong></p>
        <p style="margin:0;white-space:pre-wrap;color:#444">${esc(data.mensagem)}</p>
        <hr style="margin:20px 0;border:none;border-top:1px solid #eee" />
        <p style="margin:0;font-size:12px;color:#888">Enviada em ${when}</p>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: "Nossa História <onboarding@resend.dev>",
        to: [to],
        subject: `💌 Nova carta da Vitória: ${data.titulo}`,
        html,
        reply_to: to,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Resend letter error", res.status, txt);
      return { ok: false, error: `status_${res.status}` as const };
    }

    return { ok: true };
  });
