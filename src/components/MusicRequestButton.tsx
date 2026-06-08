import { useState } from "react";
import { Music, X, Send, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { sendMusicRequest } from "@/lib/music-request.functions";

export function MusicRequestButton() {
  const [open, setOpen] = useState(false);
  const [song, setSong] = useState("");
  const [artist, setArtist] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<null | { type: "ok" | "err"; msg: string }>(null);
  const send = useServerFn(sendMusicRequest);

  const close = () => {
    if (sending) return;
    setOpen(false);
    setTimeout(() => setStatus(null), 200);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!song.trim() || !artist.trim()) return;
    setSending(true);
    setStatus(null);
    try {
      await send({ data: { song: song.trim(), artist: artist.trim(), message: message.trim() } });
      setStatus({ type: "ok", msg: "Pedido enviado com carinho ❤" });
      setSong("");
      setArtist("");
      setMessage("");
      setTimeout(() => setOpen(false), 1400);
    } catch (err) {
      console.error(err);
      setStatus({ type: "err", msg: "Não consegui enviar. Tente novamente." });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Solicitar nova música"
        title="Solicitar nova música"
        className="fixed bottom-4 right-20 z-50 h-12 w-12 grid place-items-center rounded-full glass border border-[color:var(--rose-antique)]/20 text-[color:var(--cream)] shadow-[0_10px_30px_-10px_oklch(0.10_0.05_18/0.9)] hover:scale-105 transition-all duration-300"
      >
        <Music className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={close}
        >
          <div
            className="relative w-full max-w-md rounded-3xl glass border border-[color:var(--rose-antique)]/25 p-6 shadow-[0_20px_60px_-20px_oklch(0.10_0.05_18/0.95)] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={close}
              aria-label="Fechar"
              className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full hover:bg-[color:var(--burnt)]/20 text-[color:var(--cream)]/70"
            >
              <X className="h-4 w-4" />
            </button>

            <p className="text-[10px] uppercase tracking-[0.35em] text-[color:var(--rose-antique)]">Para nossa playlist</p>
            <h3 className="font-display text-2xl mt-1 text-[color:var(--cream)]">Solicitar nova música</h3>

            <form onSubmit={submit} className="mt-5 space-y-3">
              <div>
                <label className="text-xs text-[color:var(--cream)]/70">Nome da música *</label>
                <input
                  value={song}
                  onChange={(e) => setSong(e.target.value)}
                  required
                  maxLength={200}
                  className="mt-1 w-full rounded-xl bg-black/30 border border-[color:var(--rose-antique)]/20 px-3 py-2 text-sm text-[color:var(--cream)] outline-none focus:border-[color:var(--rose-antique)]/60"
                />
              </div>
              <div>
                <label className="text-xs text-[color:var(--cream)]/70">Artista *</label>
                <input
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  required
                  maxLength={200}
                  className="mt-1 w-full rounded-xl bg-black/30 border border-[color:var(--rose-antique)]/20 px-3 py-2 text-sm text-[color:var(--cream)] outline-none focus:border-[color:var(--rose-antique)]/60"
                />
              </div>
              <div>
                <label className="text-xs text-[color:var(--cream)]/70">Mensagem (opcional)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  className="mt-1 w-full rounded-xl bg-black/30 border border-[color:var(--rose-antique)]/20 px-3 py-2 text-sm text-[color:var(--cream)] outline-none focus:border-[color:var(--rose-antique)]/60 resize-none"
                />
              </div>

              {status && (
                <p className={`text-xs ${status.type === "ok" ? "text-[color:var(--rose-antique)]" : "text-red-300"}`}>
                  {status.msg}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={close}
                  className="flex-1 px-4 py-2.5 rounded-full glass hover:bg-[color:var(--burnt)]/20 text-sm text-[color:var(--cream)] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sending || !song.trim() || !artist.trim()}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-br from-[color:var(--burnt)] to-[color:var(--wine)] text-[color:var(--cream)] text-sm glow-wine hover:scale-[1.02] transition disabled:opacity-50 disabled:hover:scale-100"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Enviar solicitação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
