"use client";

import { useEffect, useRef } from "react";

// Head stickers drifting around the hero. They bob on their own and
// shift with the cursor; deeper ones move more.
const STICKERS = [
  { src: "/art/heads/scream.webp", x: 76, y: 13, size: 128, depth: 1.4, rot: 10, dur: 5.2 },
  { src: "/art/heads/smug.webp", x: 60, y: 19, size: 78, depth: 0.7, rot: -12, dur: 6.4 },
  { src: "/art/heads/shook.webp", x: 90, y: 64, size: 92, depth: 1.1, rot: -8, dur: 4.6 },
  { src: "/art/heads/sad.webp", x: 2, y: 22, size: 70, depth: 0.6, rot: 14, dur: 5.8 },
];

export function Floaters() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--mx", `${(e.clientX / window.innerWidth - 0.5) * 2}`);
        el.style.setProperty("--my", `${(e.clientY / window.innerHeight - 0.5) * 2}`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {STICKERS.map((s, i) => (
        <div
          key={s.src}
          className="absolute hidden md:block"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `clamp(${s.size * 0.55}px, ${s.size / 12}vw, ${s.size}px)`,
            transform: `translate(calc(var(--mx, 0) * ${s.depth * 18}px), calc(var(--my, 0) * ${s.depth * 14}px))`,
            transition: "transform .6s var(--snap)",
          }}
        >
          <div className="sticker-in" style={{ ["--i" as string]: i }}>
            <div className="bob" style={{ animationDuration: `${s.dur}s`, ["--r" as string]: `${s.rot}deg` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.src} alt="" className="aspect-square w-full rounded-full border-4 border-ink bg-sand object-cover shadow-[4px_5px_0_#120c0a]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
