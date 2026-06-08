import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/* ─────────── Scrape product metadata from a URL ─────────── */
const scrapeSchema = z.object({ url: z.string().url().max(2000) });

function pickMeta(html: string, patterns: RegExp[]): string | undefined {
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return m[1].trim();
  }
  return undefined;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function parsePrice(raw?: string): number | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/[^\d,.\-]/g, "");
  if (!cleaned) return undefined;
  // assume Brazilian format if has comma decimal
  let normalized = cleaned;
  if (cleaned.includes(",") && cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = cleaned.replace(/,/g, "");
  }
  const n = parseFloat(normalized);
  return isNaN(n) ? undefined : n;
}

export const scrapeProductUrl = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => scrapeSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const res = await fetch(data.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; NossoUniversoBot/1.0; +https://lovable.dev)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });
      if (!res.ok) return { ok: false as const };
      const html = (await res.text()).slice(0, 500_000);

      const title =
        pickMeta(html, [
          /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i,
          /<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i,
          /<meta\s+itemprop=["']name["']\s+content=["']([^"']+)["']/i,
          /<title[^>]*>([^<]+)<\/title>/i,
        ]) || undefined;

      const image =
        pickMeta(html, [
          /<meta\s+property=["']og:image:secure_url["']\s+content=["']([^"']+)["']/i,
          /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
          /<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i,
          /<link\s+rel=["']image_src["']\s+href=["']([^"']+)["']/i,
        ]) || undefined;

      const description =
        pickMeta(html, [
          /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i,
          /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i,
          /<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i,
        ]) || undefined;

      const siteName =
        pickMeta(html, [
          /<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i,
        ]) || undefined;

      const priceRaw = pickMeta(html, [
        /<meta\s+property=["']product:price:amount["']\s+content=["']([^"']+)["']/i,
        /<meta\s+property=["']og:price:amount["']\s+content=["']([^"']+)["']/i,
        /<meta\s+itemprop=["']price["']\s+content=["']([^"']+)["']/i,
        /"price"\s*:\s*"?([\d.,]+)"?/i,
      ]);

      const host = (() => {
        try {
          return new URL(data.url).hostname.replace(/^www\./, "");
        } catch {
          return undefined;
        }
      })();

      return {
        ok: true as const,
        title: title ? decodeEntities(title) : undefined,
        image,
        description: description ? decodeEntities(description) : undefined,
        store: siteName || host,
        price: parsePrice(priceRaw),
      };
    } catch (e) {
      console.error("scrape error", e);
      return { ok: false as const };
    }
  });

/* ─────────── Send notification email when item added ─────────── */
const emailSchema = z.object({
  title: z.string().trim().min(1).max(300),
  link_url: z.string().trim().max(2000).optional().default(""),
  description: z.string().trim().max(2000).optional().default(""),
  category: z.string().trim().max(120).optional().default(""),
  price: z.number().optional(),
  store: z.string().trim().max(200).optional().default(""),
});

export const sendWishlistNotification = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => emailSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY missing — skipping wishlist email");
      return { ok: false, reason: "no_key" };
    }

    const to =
      process.env.WISHLIST_NOTIFICATION_EMAIL ||
      "elielximenesgarcia@hotmail.com";
    const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const esc = (s: string) =>
      s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
    const priceFmt =
      typeof data.price === "number"
        ? data.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "—";

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;background:#fff;color:#222">
        <h2 style="margin:0 0 16px;color:#7a2e2e">💝 Novo item na Wishlist</h2>
        <p style="margin:6px 0"><strong>Título:</strong> ${esc(data.title)}</p>
        <p style="margin:6px 0"><strong>Categoria:</strong> ${esc(data.category || "—")}</p>
        <p style="margin:6px 0"><strong>Preço:</strong> ${esc(priceFmt)}</p>
        <p style="margin:6px 0"><strong>Loja:</strong> ${esc(data.store || "—")}</p>
        ${data.link_url ? `<p style="margin:6px 0"><strong>Link:</strong> <a href="${esc(data.link_url)}">${esc(data.link_url)}</a></p>` : ""}
        ${data.description ? `<p style="margin:14px 0 6px"><strong>Descrição:</strong></p><p style="margin:0;white-space:pre-wrap;color:#444">${esc(data.description)}</p>` : ""}
        <hr style="margin:20px 0;border:none;border-top:1px solid #eee" />
        <p style="margin:0;font-size:12px;color:#888">Adicionado em ${now}</p>
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
        subject: `💝 Nova Wishlist: ${data.title}`,
        html,
        reply_to: to,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Resend wishlist error", res.status, txt);
      return { ok: false, reason: "send_failed" };
    }
    return { ok: true };
  });
