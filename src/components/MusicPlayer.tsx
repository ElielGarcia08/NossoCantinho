import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ListMusic,
  Music2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

type Track = { title: string; artist: string; src: string };

const PLAYLIST: Track[] = [
  { title: "Lisboa", artist: "Anavitória", src: "/music/lisboa.mp3" },
  { title: "Can't Help Falling in Love", artist: "Elvis Presley", src: "/music/cant-help-falling-in-love.mp3" },
  { title: "Love Grows (Where My Rosemary Goes)", artist: "Edison Lighthouse", src: "/music/love-grows.mp3" },
  { title: "Can't Take My Eyes Off You", artist: "Frankie Valli", src: "/music/cant-take-my-eyes-off-you.mp3" },
  { title: "My Girl", artist: "The Temptations", src: "/music/my-girl.mp3" },
  { title: "You Are The Right One", artist: "Sports", src: "/music/you-are-the-right-one.mp3" },
  { title: "Iris", artist: "Goo Goo Dolls", src: "/music/iris.mp3" },
  { title: "Call It What You Want", artist: "Taylor Swift", src: "/music/call-it-what-you-want.mp3" },
  { title: "La Vie En Rose", artist: "Édith Piaf", src: "/music/la-vie-en-rose.mp3" },
  { title: "Daylight", artist: "Taylor Swift", src: "/music/daylight.mp3" },
  { title: "Kiss Me", artist: "Sixpence None The Richer", src: "/music/kiss-me.mp3" },
  { title: "Aliança", artist: "Tribalistas", src: "/music/alianca.mp3" },
  { title: "Timeless", artist: "Taylor Swift", src: "/music/timeless.mp3" },
  { title: "I Wanna Be Yours", artist: "Arctic Monkeys", src: "/music/i-wanna-be-yours.mp3" },
  { title: "Heaven", artist: "Bryan Adams", src: "/music/heaven.mp3" },
  { title: "Out of My League", artist: "Fitz and the Tantrums", src: "/music/out-of-my-league.mp3" },
  { title: "Young And Beautiful", artist: "Lana Del Rey", src: "/music/young-and-beautiful.mp3" },
  { title: "Minha Felicidade", artist: "Roberta Campos", src: "/music/minha-felicidade.mp3" },
];

type RepeatMode = "off" | "all" | "one";

type Ctx = {
  open: boolean;
  toggle: () => void;
  setOpen: (v: boolean) => void;
  hidden: boolean;
  setHidden: (v: boolean) => void;
  playlist: Track[];
  index: number;
  current: Track;
  playing: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  volume: number;
  muted: boolean;
  currentTime: number;
  duration: number;
  play: () => Promise<void>;
  pause: () => void;
  togglePlay: () => Promise<void>;
  next: () => void;
  prev: () => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  playAt: (i: number) => Promise<void>;
  unlock: () => Promise<void>;
};

const PlayerCtx = createContext<Ctx | null>(null);
export const usePlayer = () => useContext(PlayerCtx)!;

// Module-level singleton so the audio element survives any React remounts
// (route transitions, HMR, error boundaries). Created lazily in the browser.
let sharedAudio: HTMLAudioElement | null = null;
function getSharedAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.preload = "metadata";
  }
  return sharedAudio;
}

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  if (!audioRef.current) audioRef.current = getSharedAudio();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("all");
  const [volume, setVolumeState] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const current = PLAYLIST[index];

  // Set src imperatively only when track changes — avoids browser reloading
  // the audio on every React re-render or route transition.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const nextSrc = new URL(current.src, window.location.origin).href;
    if (a.src !== nextSrc) {
      a.src = current.src;
    }
  }, [current.src]);

  // sync volume/mute to audio
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = volume;
    a.muted = muted;
  }, [volume, muted]);

  const play = useCallback(async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      await a.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
  }, []);

  const togglePlay = useCallback(async () => {
    if (playing) pause();
    else await play();
  }, [playing, play, pause]);

  const playAt = useCallback(async (i: number) => {
    const ni = ((i % PLAYLIST.length) + PLAYLIST.length) % PLAYLIST.length;
    setIndex(ni);
    const a = audioRef.current;
    if (!a) return;
    // Update src imperatively so play() always uses the new track, even when
    // called synchronously from the "ended" event (before React re-renders).
    const nextSrc = new URL(PLAYLIST[ni].src, window.location.origin).href;
    if (a.src !== nextSrc) a.src = PLAYLIST[ni].src;
    try {
      a.currentTime = 0;
      await a.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }, []);

  const next = useCallback(() => {
    if (shuffle) {
      let n = index;
      if (PLAYLIST.length > 1) {
        while (n === index) n = Math.floor(Math.random() * PLAYLIST.length);
      }
      void playAt(n);
    } else {
      void playAt(index + 1);
    }
  }, [shuffle, index, playAt]);

  const prev = useCallback(() => {
    const a = audioRef.current;
    if (a && a.currentTime > 3) {
      a.currentTime = 0;
      return;
    }
    void playAt(index - 1);
  }, [index, playAt]);

  const seek = useCallback((t: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = t;
    setCurrentTime(t);
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (v > 0) setMuted(false);
  }, []);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);
  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);
  const cycleRepeat = useCallback(() => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off")), []);

  const unlock = useCallback(async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      a.muted = true;
      await a.play();
      a.pause();
      a.currentTime = 0;
      a.muted = muted;
      setOpen(true);
      await a.play();
      setPlaying(true);
    } catch {
      // ignored
    }
  }, [muted]);

  const onEnded = useCallback(() => {
    if (repeat === "one") {
      const a = audioRef.current;
      if (a) {
        a.currentTime = 0;
        void a.play();
      }
      return;
    }
    if (!shuffle && repeat === "off" && index === PLAYLIST.length - 1) {
      setPlaying(false);
      return;
    }
    next();
  }, [repeat, shuffle, index, next]);

  // Attach audio event listeners imperatively to the shared audio element.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onLoadedMetadata = () => setDuration(a.duration || 0);
    const onTimeUpdate = () => setCurrentTime(a.currentTime);
    const onPlayEv = () => setPlaying(true);
    const onPauseEv = () => setPlaying(false);
    a.addEventListener("loadedmetadata", onLoadedMetadata);
    a.addEventListener("timeupdate", onTimeUpdate);
    a.addEventListener("ended", onEnded);
    a.addEventListener("play", onPlayEv);
    a.addEventListener("pause", onPauseEv);
    // sync initial state in case audio already has metadata
    if (a.duration) setDuration(a.duration);
    setCurrentTime(a.currentTime);
    setPlaying(!a.paused);
    return () => {
      a.removeEventListener("loadedmetadata", onLoadedMetadata);
      a.removeEventListener("timeupdate", onTimeUpdate);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("play", onPlayEv);
      a.removeEventListener("pause", onPauseEv);
    };
  }, [onEnded]);

  const ctx = useMemo<Ctx>(
    () => ({
      open,
      toggle: () => setOpen((v) => !v),
      setOpen,
      hidden,
      setHidden,
      playlist: PLAYLIST,
      index,
      current,
      playing,
      shuffle,
      repeat,
      volume,
      muted,
      currentTime,
      duration,
      play,
      pause,
      togglePlay,
      next,
      prev,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      playAt,
      unlock,
    }),
    [
      open,
      hidden,
      index,
      current,
      playing,
      shuffle,
      repeat,
      volume,
      muted,
      currentTime,
      duration,
      play,
      pause,
      togglePlay,
      next,
      prev,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      playAt,
      unlock,
    ],
  );

  return (
    <PlayerCtx.Provider value={ctx}>
      {children}
      <PlayerUI />
    </PlayerCtx.Provider>
  );
}

function fmt(s: number) {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${sec}`;
}

function PlayerUI() {
  const p = usePlayer();
  const [showList, setShowList] = useState(false);

  if (p.hidden) {
    return (
      <button
        onClick={() => p.setHidden(false)}
        aria-label="Mostrar player"
        className="fixed bottom-4 right-4 z-50 h-12 w-12 grid place-items-center rounded-full glass border border-[color:var(--rose-antique)]/20 text-[color:var(--cream)] shadow-[0_10px_30px_-10px_oklch(0.10_0.05_18/0.9)] hover:scale-105 transition-all duration-300 animate-in fade-in zoom-in"
      >
        <Music2 className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-3 sm:bottom-5 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 sm:w-[min(540px,calc(100vw-2rem))] animate-in fade-in slide-in-from-bottom-4 duration-300">

      <div className="glass rounded-3xl overflow-hidden shadow-[0_20px_60px_-20px_oklch(0.10_0.05_18/0.9)] border border-[color:var(--rose-antique)]/15">
        {/* Header / collapsed bar */}
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="relative h-11 w-11 shrink-0 rounded-2xl bg-gradient-to-br from-[color:var(--burnt)] to-[color:var(--wine)] grid place-items-center glow-wine">
            <Music2 className="h-5 w-5 text-[color:var(--cream)]" />
          </div>
          <button
            onClick={() => p.setOpen(!p.open)}
            className="min-w-0 flex-1 text-left"
            aria-label={p.open ? "Recolher player" : "Expandir player"}
          >
            <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--rose-antique)]">Nosso Romance ❤</p>
            <p className="truncate text-sm font-medium text-[color:var(--cream)]">
              {p.current.title}
              <span className="text-[color:var(--cream)]/50"> — {p.current.artist}</span>
            </p>
          </button>

          <button
            onClick={p.prev}
            className="p-2 rounded-full hover:bg-white/5 text-[color:var(--cream)]/80"
            aria-label="Anterior"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            onClick={() => void p.togglePlay()}
            className="h-10 w-10 grid place-items-center rounded-full bg-[color:var(--cream)] text-[color:var(--ink)] hover:scale-105 transition"
            aria-label={p.playing ? "Pausar" : "Tocar"}
          >
            {p.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </button>
          <button
            onClick={p.next}
            className="p-2 rounded-full hover:bg-white/5 text-[color:var(--cream)]/80"
            aria-label="Próxima"
          >
            <SkipForward className="h-4 w-4" />
          </button>
          <button
            onClick={() => p.setOpen(!p.open)}
            className="hidden sm:grid p-2 rounded-full hover:bg-white/5 text-[color:var(--cream)]/60 place-items-center"
            aria-label={p.open ? "Recolher" : "Expandir"}
          >
            {p.open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <button
            onClick={() => p.setHidden(true)}
            className="p-2 rounded-full hover:bg-white/5 text-[color:var(--cream)]/60"
            aria-label="Ocultar player"
            title="Ocultar player"
          >
            <X className="h-4 w-4" />
          </button>
        </div>


        {/* Expanded */}
        <div
          className={`transition-all duration-500 ease-out ${
            p.open ? "max-h-[640px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-4 pb-4 space-y-3">
            {/* Progress */}
            <div className="flex items-center gap-3 text-[10px] tabular-nums text-[color:var(--cream)]/60">
              <span>{fmt(p.currentTime)}</span>
              <input
                type="range"
                min={0}
                max={Math.max(p.duration, 0.0001)}
                step={0.1}
                value={Math.min(p.currentTime, p.duration || 0)}
                onChange={(e) => p.seek(parseFloat(e.target.value))}
                className="flex-1 accent-[color:var(--burnt)] h-1 cursor-pointer"
                aria-label="Progresso"
              />
              <span>{fmt(p.duration)}</span>
            </div>

            {/* Secondary controls */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={p.toggleShuffle}
                className={`p-2 rounded-full hover:bg-white/5 transition ${
                  p.shuffle ? "text-[color:var(--rose-antique)]" : "text-[color:var(--cream)]/60"
                }`}
                aria-label="Aleatório"
              >
                <Shuffle className="h-4 w-4" />
              </button>
              <button
                onClick={p.cycleRepeat}
                className={`p-2 rounded-full hover:bg-white/5 transition ${
                  p.repeat !== "off" ? "text-[color:var(--rose-antique)]" : "text-[color:var(--cream)]/60"
                }`}
                aria-label="Repetir"
              >
                {p.repeat === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
              </button>

              <div className="flex items-center gap-2 flex-1 max-w-[180px] ml-2">
                <button
                  onClick={p.toggleMute}
                  className="p-1.5 rounded-full hover:bg-white/5 text-[color:var(--cream)]/70"
                  aria-label={p.muted ? "Ativar som" : "Silenciar"}
                >
                  {p.muted || p.volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={p.muted ? 0 : p.volume}
                  onChange={(e) => p.setVolume(parseFloat(e.target.value))}
                  className="flex-1 accent-[color:var(--burnt)] h-1 cursor-pointer"
                  aria-label="Volume"
                />
              </div>

              <button
                onClick={() => setShowList((s) => !s)}
                className={`p-2 rounded-full hover:bg-white/5 transition ${
                  showList ? "text-[color:var(--rose-antique)]" : "text-[color:var(--cream)]/60"
                }`}
                aria-label="Playlist"
              >
                <ListMusic className="h-4 w-4" />
              </button>
            </div>

            {/* Playlist */}
            <div
              className={`transition-all duration-500 overflow-hidden ${
                showList ? "max-h-72 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <ul className="max-h-72 overflow-y-auto pr-1 space-y-1">
                {p.playlist.map((t, i) => {
                  const active = i === p.index;
                  return (
                    <li key={t.src}>
                      <button
                        onClick={() => void p.playAt(i)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition ${
                          active
                            ? "bg-[color:var(--burnt)]/25 text-[color:var(--cream)]"
                            : "hover:bg-white/5 text-[color:var(--cream)]/75"
                        }`}
                      >
                        <span className="w-5 text-xs tabular-nums text-[color:var(--cream)]/40">
                          {active && p.playing ? "♪" : i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{t.title}</span>
                          <span className="block truncate text-[11px] text-[color:var(--cream)]/50">{t.artist}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
