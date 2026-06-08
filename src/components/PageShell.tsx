import type { ReactNode } from "react";

export function PageShell({
  eyebrow,
  title,
  subtitle,
  children,
  eyebrowClassName = "text-[color:var(--rose-antique)]",
  titleClassName = "text-gradient-rose",
  subtitleClassName = "text-[color:var(--cream)]/70",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  eyebrowClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}) {
  return (
    <main className="relative z-10 min-h-screen px-4 sm:px-8 pt-32 pb-40 max-w-6xl mx-auto">
      <div className="text-center max-w-3xl mx-auto animate-fade-up">
        {eyebrow && (
          <p className={`text-[10px] uppercase tracking-[0.4em] mb-4 ${eyebrowClassName}`}>
            {eyebrow}
          </p>
        )}
        <h1 className={`font-display text-5xl sm:text-7xl text-balance ${titleClassName}`}>
          {title}
        </h1>
        {subtitle && (
          <p className={`mt-6 text-base sm:text-lg text-balance ${subtitleClassName}`}>
            {subtitle}
          </p>
        )}
      </div>
      {children && <div className="mt-16">{children}</div>}
    </main>
  );
}
