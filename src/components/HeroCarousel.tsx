import { useEffect, useState } from "react";

const defaultHeroImages = [
  "/images/foto1.jpg",
  "/images/foto7.jpg",
  "/images/foto2.jpg",
  "/images/foto5.jpg",
  "/images/foto6.jpg",
  "/images/foto3.jpg",
  "/images/foto4.jpg",
];

type Props = {
  alt: string;
  images?: string[];
  interval?: number;
  objectPosition?: string;
};

export function HeroCarousel({
  alt,
  images,
  interval = 5000,
  objectPosition = "center 20%",
}: Props) {
  const list = images && images.length > 0 ? images : defaultHeroImages;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (list.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % list.length);
    }, interval);
    return () => clearInterval(id);
  }, [list.length, interval]);

  // Preload next image
  useEffect(() => {
    if (list.length <= 1) return;
    const next = new Image();
    next.src = list[(index + 1) % list.length];
  }, [index, list]);

  return (
    <>
      {list.map((src, i) => {
        const active = i === index;
        return (
          <img
            key={src + i}
            src={src}
            alt={alt}
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              objectPosition,
              opacity: active ? 1 : 0,
              transform: active ? "scale(1.08)" : "scale(1.02)",
              filter: active ? "blur(0px)" : "blur(6px)",
              transition:
                "opacity 1800ms ease-in-out, transform 6000ms ease-out, filter 1800ms ease-in-out",
              willChange: "opacity, transform, filter",
            }}
          />
        );
      })}
    </>
  );
}
