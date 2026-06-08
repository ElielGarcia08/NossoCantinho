import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  song: z.string().trim().min(1).max(200),
  artist: z.string().trim().min(1).max(200),
  message: z.string().trim().max(1000).optional().default(""),
});

export const sendMusicRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY não configurada");

    const to = process.env.MUSIC_REQUEST_RECIPIENT_EMAIL || "elielximenesgarcia@hotmail.com";
    const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    const esc = (s: string) =>
      s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;background:#fff;color:#222">
        <h2 style="margin:0 0 16px;color:#7a2e2e">🎵 Nova solicitação de música</h2>
        <p style="margin:6px 0"><strong>Música:</strong> ${esc(data.song)}</p>
        <p style="margin:6px 0"><strong>Artista:</strong> ${esc(data.artist)}</p>
        ${data.message ? `<p style="margin:14px 0 6px"><strong>Mensagem:</strong></p><p style="margin:0;white-space:pre-wrap;color:#444">${esc(data.message)}</p>` : ""}
        <hr style="margin:20px 0;border:none;border-top:1px solid #eee" />
        <p style="margin:0;font-size:12px;color:#888">Enviado em ${now}</p>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "Nosso Universo <onboarding@resend.dev>",
        to: [to],
        subject: `🎵 Nova música: ${data.song} — ${data.artist}`,
        html,
        reply_to: to,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Resend error", res.status, txt);
      throw new Error(`Falha ao enviar e-mail (${res.status})`);
    }

    return { ok: true };
  });
