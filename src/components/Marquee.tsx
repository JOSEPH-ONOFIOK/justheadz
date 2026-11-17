"use client";

import { useEffect, useRef } from "react";
import { MOODS } from "@/lib/heads";

// Scrolling mood strip. Speeds up and leans when you scroll fast.
export function Marquee({ tone = "wine", tilt = -3, reverse = false }: { tone?: "wine" | "ink"; tilt?: number; reverse?: boolean }) {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let x = 0;
    let last = window.scrollY;
    let boost = 0;
    let raf = 0;
    let prev = performance.now();
    let visible = true;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(tick);
    });
    io.observe(el);

    function tick(now: number) {
      raf = 0;
      if (!visible || !el) return;
      const dt = Math.min(now - prev, 50);
      prev = now;
      const y = window.scrollY;
      boost += (Math.min(Math.abs(y - last), 80) * 0.35 - boost) * 0.12;
      last = y;
      const speed = still ? 0 : (0.06 + boost * 0.05) * dt;
      const half = el.scrollWidth / 2;
      x = (x + speed) % half;
      el.style.transform = `translateX(${reverse ? x - half : -x}px) skewX(${-Math.min(boost, 20) * 0.6}deg)`;
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [reverse]);

  const words = [...MOODS, "New evolution"];
  const row = (hidden: boolean) => (
    <div className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {words.map((w) => (
        <span key={w} className="display flex items-center px-6 text-[clamp(1.6rem,4vw,3rem)]">
          {w}
          <span className="ml-12 inline-block h-4 w-4 rotate-45 bg-current" />
        </span>
      ))}
    </div>
  );
  return (
    // The band is wider than the screen so its tilted ends never show; the wrapper clips it
    <div className="relative z-10 overflow-x-clip py-6">
      <div
        className={`-mx-[6%] overflow-hidden border-y-4 border-ink py-3 sm:py-4 ${tone === "wine" ? "bg-wine text-bone" : "bg-ink text-sand"}`}
        style={{ transform: `rotate(${tilt}deg)` }}
      >
        <div ref={track} className="flex w-max will-change-transform">
          {row(false)}
          {row(true)}
        </div>
      </div>
    </div>
  );
}
