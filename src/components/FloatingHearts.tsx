import { useEffect, useState } from "react";

export function FloatingHearts({ count = 14 }: { count?: number }) {
  const [hearts, setHearts] = useState<Array<{ id: number; left: number; delay: number; duration: number; size: number; opacity: number }>>([]);

  useEffect(() => {
    setHearts(
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 14,
        duration: 14 + Math.random() * 18,
        size: 10 + Math.random() * 18,
        opacity: 0.25 + Math.random() * 0.45,
      }))
    );
  }, [count]);


  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {hearts.map((h) => (
        <span
          key={h.id}
          className="absolute bottom-[-10vh] animate-float-heart text-[color:var(--rose-antique)]"
          style={{
            left: `${h.left}%`,
            animationDelay: `${h.delay}s`,
            animationDuration: `${h.duration}s`,
            fontSize: `${h.size}px`,
            opacity: h.opacity,
            filter: "drop-shadow(0 0 8px oklch(0.55 0.18 25 / 0.5))",
          }}
        >
          ♥
        </span>
      ))}
    </div>
  );
}
