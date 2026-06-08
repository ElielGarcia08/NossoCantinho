import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X, Trash2, ImagePlus, Calendar, Heart, Pencil, Loader2, Minus } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { HeroCarousel } from "@/components/HeroCarousel";
import momentosBg from "@/assets/momentos-bg.png";
import { requireAuth } from "@/lib/auth-route";

const ZOOM_LEVELS = [0.75, 0.9, 1, 1.25] as const;
const ZOOM_KEY = "momentos-zoom";
import { supabase } from "@/integrations/supabase/client";
import { ensureUploaded } from "@/lib/storage-upload";

type Moment = {
  id: string;
  title: string;
  date: string; // ISO yyyy-mm-dd
  images: string[];
  comment?: string;
};

type Row = {
  id: string;
  title: string;
  date: string;
  image_url: string;
  image_urls: string[] | null;
  comment: string | null;
};

const rowToMoment = (r: Row): Moment => {
  const urls = (r.image_urls && r.image_urls.length > 0)
    ? r.image_urls
    : (r.image_url ? [r.image_url] : []);
  return {
    id: r.id,
    title: r.title,
    date: r.date,
    images: urls,
    comment: r.comment ?? undefined,
  };
};

function fmtDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

const sortAsc = (a: Moment, b: Moment) =>
  new Date(a.date).getTime() - new Date(b.date).getTime();

export const Route = createFileRoute("/momentos")({
  beforeLoad: requireAuth,
  component: MomentosPage,
});

function MomentosPage() {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Moment | null>(null);
  const [creating, setCreating] = useState<Moment | null | false>(false);
  const [year, setYear] = useState<"all" | string>("all");
  const [reveal, setReveal] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    const v = parseFloat(window.localStorage.getItem(ZOOM_KEY) ?? "1");
    return ZOOM_LEVELS.includes(v as typeof ZOOM_LEVELS[number]) ? v : 1;
  });
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(ZOOM_KEY, String(zoom));
  }, [zoom]);
  const zoomIdx = ZOOM_LEVELS.indexOf(zoom as typeof ZOOM_LEVELS[number]);

  // Pre-fill from query params (?title=...&date=...) when redirected from /dates.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("title");
    const d = sp.get("date");
    const img = sp.get("image");
    const c = sp.get("comment");
    if (t || d || img || c) {
      setCreating({
        id: "", title: t ?? "", date: d ?? new Date().toISOString().slice(0, 10),
        images: img ? [img] : [], comment: c ?? undefined,
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);


  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("moments")
        .select("*")
        .order("date", { ascending: true });
      setMoments((data ?? []).map((r) => rowToMoment(r as unknown as Row)));
      setLoading(false);
    })();
  }, []);

  const years = useMemo(() => {
    const set = new Set<string>();
    moments.forEach((m) => m.date && set.add(m.date.slice(0, 4)));
    return Array.from(set).sort();
  }, [moments]);

  const filtered = useMemo(() => {
    const list = year === "all" ? moments : moments.filter((m) => m.date.startsWith(year));
    return [...list].sort(sortAsc);
  }, [moments, year]);

  const upsert = async (m: Moment) => {
    const uploaded: string[] = [];
    for (const img of m.images) {
      const url = await ensureUploaded("moments-images", img);
      if (url) uploaded.push(url);
    }
    const payload = {
      title: m.title,
      date: m.date,
      image_url: uploaded[0] ?? "",
      image_urls: uploaded,
      comment: m.comment ?? null,
    };
    const exists = moments.some((p) => p.id === m.id);
    if (exists) {
      const { data } = await supabase.from("moments").update(payload as never).eq("id", m.id).select().single();
      if (data) setMoments((prev) => prev.map((p) => (p.id === m.id ? rowToMoment(data as unknown as Row) : p)));
      return { isNew: false as const, firstImage: uploaded[0] ?? null };
    } else {
      const { data } = await supabase.from("moments").insert(payload as never).select().single();
      if (data) setMoments((prev) => [...prev, rowToMoment(data as unknown as Row)]);
      return { isNew: true as const, firstImage: uploaded[0] ?? null };
    }
  };

  const remove = async (id: string) => {
    await supabase.from("moments").delete().eq("id", id);
    setMoments((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <PageShell
      eyebrow="Capítulo 01"
      title="Nossos Momentos"
      subtitle="A linha do tempo do nosso amor — que seja um incentivo para tirarmos mais fotos."
    >
      <div className="relative">
        <div
          aria-hidden
          className="fixed inset-0 -z-10 pointer-events-none"
          style={{
            backgroundImage: `url(${momentosBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div
          aria-hidden
          className="fixed inset-0 -z-10 pointer-events-none"
          style={{ background: "oklch(0.08 0.04 30 / 0.35)" }}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <YearFilter years={years} value={year} onChange={setYear} />
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 glass rounded-full p-1">
              <button
                onClick={() => setZoom(ZOOM_LEVELS[Math.max(0, zoomIdx - 1)])}
                disabled={zoomIdx <= 0}
                className="p-1.5 rounded-full text-[color:var(--cream)]/70 hover:text-[color:var(--cream)] disabled:opacity-30"
                aria-label="Diminuir zoom"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 text-xs tabular-nums text-[color:var(--cream)]/80 min-w-[3ch] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length - 1, zoomIdx + 1)])}
                disabled={zoomIdx >= ZOOM_LEVELS.length - 1}
                className="p-1.5 rounded-full text-[color:var(--cream)]/70 hover:text-[color:var(--cream)] disabled:opacity-30"
                aria-label="Aumentar zoom"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              onClick={() => setCreating(null)}
              className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[color:var(--burnt)] to-[color:var(--wine)] text-[color:var(--cream)] shadow-[0_10px_30px_-10px_oklch(0.35_0.10_18/0.7)] hover:scale-[1.03] transition-all"
            >
              <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
              <span className="text-sm font-medium tracking-wide">Adicionar Momento</span>
              <Heart className="h-3.5 w-3.5 fill-current text-[color:var(--rose-antique)]" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-[color:var(--cream)]/50">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div
            className="grid gap-x-6 gap-y-10 px-2 pb-10"
            style={{
              zoom,
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              overflow: "visible",
            }}
          >
            {filtered.map((m) => (
              <MomentCard key={m.id} moment={m} onEdit={() => setEditing(m)} />
            ))}
          </div>
        )}

      {(creating !== false || editing) && (
        <MomentModal
          initial={editing ?? (creating || null)}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={async (m) => {
            const res = await upsert(m);
            setCreating(false);
            setEditing(null);
            if (res?.isNew && res.firstImage) setReveal(res.firstImage);
          }}
          onDelete={
            editing
              ? async () => {
                  await remove(editing.id);
                  setEditing(null);
                }
              : undefined
          }
        />
      )}

      {reveal && <CameraReveal image={reveal} onDone={() => setReveal(null)} />}
      </div>
    </PageShell>
  );
}

function YearFilter({
  years,
  value,
  onChange,
}: {
  years: string[];
  value: string;
  onChange: (v: "all" | string) => void;
}) {
  if (years.length <= 1) return <div />;
  const opts: Array<"all" | string> = ["all", ...years];
  return (
    <div className="flex flex-wrap items-center gap-1.5 glass rounded-full p-1">
      {opts.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-3.5 py-1.5 rounded-full text-xs tracking-wide transition-all ${
              active
                ? "bg-gradient-to-r from-[color:var(--burnt)] to-[color:var(--wine)] text-[color:var(--cream)] shadow-[0_6px_20px_-8px_oklch(0.35_0.10_18/0.8)]"
                : "text-[color:var(--cream)]/60 hover:text-[color:var(--cream)]"
            }`}
          >
            {opt === "all" ? "Todos" : opt}
          </button>
        );
      })}
    </div>
  );
}

function MomentCard({ moment, onEdit }: { moment: Moment; onEdit: () => void }) {
  const hasComment = !!moment.comment?.trim();
  const images = moment.images;
  const hasMany = images.length > 1;

  // Deterministic tiny rotation from id, between -4 and +4 degrees
  const rotation = useMemo(() => {
    let h = 0;
    for (let i = 0; i < moment.id.length; i++) h = (h * 31 + moment.id.charCodeAt(i)) | 0;
    return ((Math.abs(h) % 81) - 40) / 10; // -4.0 .. +4.0
  }, [moment.id]);

  return (
    <div
      className="group relative flex flex-col items-center pt-3 pb-4 transition-transform duration-500 ease-out hover:-translate-y-2 hover:scale-[1.02]"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      {/* Tachinha */}
      <div
        aria-hidden
        className="absolute top-0 left-1/2 -translate-x-1/2 z-20 h-4 w-4 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, oklch(0.85 0.18 25), oklch(0.45 0.18 22) 70%, oklch(0.25 0.12 20))",
          boxShadow:
            "0 2px 3px rgba(0,0,0,0.55), inset -1px -1px 2px rgba(0,0,0,0.45), inset 1px 1px 1px rgba(255,255,255,0.5)",
        }}
      />

      {/* Polaroid */}
      <div className="polaroid-paper relative w-full p-3 pb-12 rounded-[6px] transition-shadow duration-500 group-hover:shadow-[0_30px_50px_-20px_rgba(20,10,5,0.85)]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-black/40 text-white/90 backdrop-blur hover:bg-[color:var(--wine)]/80 transition opacity-0 group-hover:opacity-100"
          aria-label="Editar momento"
        >
          <Pencil className="h-3 w-3" />
        </button>

        <div className="relative aspect-square overflow-hidden bg-[#1a1208]">
          {images.length === 0 ? (
            <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--burnt)]/40 to-[color:var(--wine)]/40" />
          ) : hasMany ? (
            <HeroCarousel
              alt={moment.title}
              images={images}
              interval={5000}
              objectPosition="center center"
            />
          ) : (
            <img
              src={images[0]}
              alt={moment.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          {/* Brilho vintage */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_15%,rgba(255,255,255,0.18),transparent_55%)]" />
        </div>

        {/* Legenda (título + data) */}
        <div className="pt-3 px-1 text-center">
          <h3 className="font-handwritten text-[1.45rem] leading-tight text-[#3a2616]">
            {moment.title}
          </h3>
          <p className="font-handwritten text-base text-[#7a5a3a] mt-0.5">
            {fmtDate(moment.date)}
          </p>
        </div>
      </div>

      {/* Comentário tipo anotação */}
      {hasComment && (
        <p className="font-handwritten text-[1.05rem] leading-snug text-[color:var(--cream)]/85 text-center mt-3 max-w-[85%] text-balance">
          “{moment.comment}”
        </p>
      )}
    </div>
  );
}

function CameraReveal({ image, onDone }: { image: string | null; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3300);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center">
      <div className="absolute inset-0 bg-[color:var(--ink)]/70 backdrop-blur-sm animate-in fade-in duration-300" />
      {/* Flash */}
      <div
        className="absolute inset-0 animate-flash"
        style={{
          background:
            "radial-gradient(circle at center, rgba(255,255,255,0.95), rgba(255,225,160,0.5) 40%, transparent 75%)",
        }}
      />
      {/* Câmera */}
      <div className="relative animate-camera-in animate-camera-shake" style={{ width: 220, height: 260 }}>
        {/* Corpo */}
        <div
          className="absolute inset-x-0 bottom-0 h-[170px] rounded-[18px]"
          style={{
            background: "linear-gradient(180deg,#f5efe2 0%, #e6dcc6 100%)",
            boxShadow: "0 25px 50px -15px rgba(0,0,0,0.7), inset 0 -6px 12px rgba(0,0,0,0.15)",
          }}
        />
        {/* Topo */}
        <div
          className="absolute inset-x-3 top-[60px] h-[40px] rounded-t-[14px]"
          style={{
            background: "linear-gradient(180deg,#2a1d12,#4a3322)",
            boxShadow: "inset 0 -2px 4px rgba(0,0,0,0.4)",
          }}
        />
        {/* Faixa rainbow */}
        <div className="absolute left-3 right-3 top-[100px] h-[6px] flex overflow-hidden rounded-sm">
          <div className="flex-1" style={{ background: "#e94f4f" }} />
          <div className="flex-1" style={{ background: "#f2a93b" }} />
          <div className="flex-1" style={{ background: "#f0d24a" }} />
          <div className="flex-1" style={{ background: "#5fb86a" }} />
          <div className="flex-1" style={{ background: "#4a90e2" }} />
        </div>
        {/* Lente */}
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-[24px] h-[110px] w-[110px] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, #6b6b6b 0%, #1a1a1a 60%, #000 100%)",
            boxShadow:
              "0 0 0 8px #2a1d12, 0 0 0 12px #f5efe2, inset 0 0 18px rgba(0,0,0,0.9)",
          }}
        >
          <div
            className="absolute inset-3 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 40% 35%, rgba(255,255,255,0.5), transparent 35%), radial-gradient(circle, #0a0a0a, #000)",
            }}
          />
        </div>
        {/* Flash bulb */}
        <div
          className="absolute top-[68px] right-4 h-4 w-4 rounded-full"
          style={{
            background: "radial-gradient(circle, #fff8c0, #d4a83a)",
            boxShadow: "0 0 12px rgba(255,230,120,0.9)",
          }}
        />
        {/* Slot saída */}
        <div className="absolute left-6 right-6 bottom-[155px] h-[3px] rounded-full bg-black/60" />

        {/* Foto ejetada */}
        {image && (
          <div
            className="absolute left-1/2 top-[140px] animate-photo-eject polaroid-paper p-2 pb-6 rounded-[4px]"
            style={{ width: 140 }}
          >
            <img
              src={image}
              alt=""
              className="block w-full aspect-square object-cover"
            />
          </div>
        )}
      </div>
    </div>
  );
}


function MomentModal({
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  initial: Moment | null;
  onClose: () => void;
  onSave: (m: Moment) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const onPickFiles = (files: FileList) => {
    const arr = Array.from(files);
    const tooBig = arr.find((f) => f.size > 4 * 1024 * 1024);
    if (tooBig) {
      setError("Cada foto precisa ter menos de 4MB.");
      return;
    }
    Promise.all(
      arr.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
      )
    ).then((urls) => {
      setImages((prev) => [...prev, ...urls]);
      setError("");
    });
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (!title.trim()) return setError("Coloca um título 💌");
    if (!date) return setError("Escolhe uma data ✨");
    if (images.length === 0) return setError("Adiciona ao menos uma foto 📸");
    setSaving(true);
    try {
      await onSave({
        id: initial?.id ?? "",
        title: title.trim(),
        date,
        images,
        comment: comment.trim() || undefined,
      });
    } catch (e) {
      setError("Erro ao salvar. Tenta de novo.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[color:var(--ink)]/70 backdrop-blur-xl" />
      <div
        className="relative w-full sm:max-w-lg glass rounded-t-3xl sm:rounded-3xl border border-[color:var(--rose-antique)]/20 shadow-[0_30px_80px_-20px_oklch(0.10_0.05_18/0.9)] overflow-hidden animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--rose-antique)]">
              {initial ? "Editar momento" : "Novo momento"}
            </p>
            <h2 className="font-display text-xl text-[color:var(--cream)] mt-0.5">
              {initial ? "Um retoque no nosso álbum" : "Um instante pra eternidade"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/5 text-[color:var(--cream)]/70"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {images.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-white/10">
                  <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-[color:var(--ink)]/70 text-[color:var(--cream)] hover:bg-[color:var(--wine)]/80 transition"
                    aria-label="Remover foto"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative w-full aspect-video rounded-2xl overflow-hidden border border-dashed border-[color:var(--rose-antique)]/30 hover:border-[color:var(--rose-antique)]/60 transition-colors group flex items-center justify-center"
          >
            <div className="flex flex-col items-center justify-center gap-2 text-[color:var(--cream)]/60">
              <ImagePlus className="h-6 w-6" />
              <span className="text-sm">
                {images.length > 0 ? "Adicionar mais fotos" : "Toque pra escolher fotos"}
              </span>
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onPickFiles(e.target.files);
                e.target.value = "";
              }
            }}
          />

          <Field label="Título">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="Nosso primeiro oi..."
              className="w-full bg-transparent text-[color:var(--cream)] outline-none placeholder:text-[color:var(--cream)]/30"
            />
          </Field>

          <Field label="Data" icon={<Calendar className="h-3.5 w-3.5" />}>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-transparent text-[color:var(--cream)] outline-none [color-scheme:dark]"
            />
          </Field>

          <Field label="Comentário (opcional)">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={400}
              rows={3}
              placeholder="O que tornou esse momento inesquecível..."
              className="w-full bg-transparent text-[color:var(--cream)] outline-none resize-none placeholder:text-[color:var(--cream)]/30"
            />
          </Field>

          {error && <p className="text-sm text-[color:var(--rose-antique)] text-center">{error}</p>}
        </div>

        <div className="flex items-center gap-2 px-5 py-4 border-t border-white/5 bg-[color:var(--ink)]/40">
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2.5 rounded-full hover:bg-[color:var(--wine)]/30 text-[color:var(--cream)]/60 hover:text-[color:var(--rose-antique)] transition"
              aria-label="Excluir momento"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-sm text-[color:var(--cream)]/70 hover:text-[color:var(--cream)] transition"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-5 py-2 rounded-full text-sm bg-gradient-to-r from-[color:var(--burnt)] to-[color:var(--wine)] text-[color:var(--cream)] shadow-[0_10px_30px_-10px_oklch(0.35_0.10_18/0.7)] hover:scale-[1.03] transition disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-[color:var(--rose-antique)] mb-1.5">
        {icon}
        {label}
      </span>
      <div className="rounded-2xl bg-[color:var(--ink)]/40 border border-white/5 px-4 py-3 focus-within:border-[color:var(--rose-antique)]/40 transition-colors">
        {children}
      </div>
    </label>
  );
}
