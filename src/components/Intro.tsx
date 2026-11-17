"use client";

import { useEffect, useState } from "react";

// A jagged tear across the page, as percentages. Fixed so server and client match.
const TEAR: [number, number][] = [
  [-2, 61], [8, 57], [14, 60], [22, 54], [29, 57], [37, 51], [44, 54], [52, 47],
  [58, 50], [66, 44], [73, 47], [81, 41], [88, 44], [95, 38], [102, 40],
];
const line = TEAR.map(([x, y]) => `${x}% ${y}%`).join(", ");
const TOP = `polygon(-2% -2%, 102% -2%, ${[...TEAR].reverse().map(([x, y]) => `${x}% ${y}%`).join(", ")})`;
const BOTTOM = `polygon(${line}, 102% 102%, -2% 102%)`;

type Phase = "crack" | "split" | "gone";

export function Intro() {
  const [phase, setPhase] = useState<Phase>("crack");

  useEffect(() => {
    const seen = document.documentElement.dataset.seen === "1";
    const still = seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      sessionStorage.setItem("jh-intro", "1");
    } catch {}
    if (!still) document.documentElement.style.overflow = "hidden";
    const t1 = setTimeout(() => setPhase("split"), still ? 0 : 750);
    const t2 = setTimeout(() => setPhase("gone"), still ? 0 : 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      document.documentElement.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (phase !== "gone") return;
    document.documentElement.style.overflow = "";
    // coming back to the home page in this visit shouldn't replay it
    document.documentElement.dataset.seen = "1";
  }, [phase]);

  if (phase === "gone") return null;
  const open = phase === "split";

  const half = (clip: string, dir: -1 | 1) => (
    <div
      className="absolute inset-0 bg-sand"
      style={{
        clipPath: clip,
        transform: open ? `translateY(${dir * 70}%) rotate(${dir * 4}deg)` : "none",
        transition: "transform 0.75s cubic-bezier(.7,0,.2,1)",
      }}
    >
      <div className="absolute inset-0 grid place-items-center">
        <span className="display text-[clamp(3.5rem,15vw,13rem)] text-ink">JustHeadz</span>
      </div>
    </div>
  );

  return (
    <div
      className="intro fixed inset-0 z-[100] cursor-pointer"
      aria-hidden="true"
      onClick={() => setPhase("gone")}
      style={{ pointerEvents: open ? "none" : "auto" }}
    >
      {half(TOP, -1)}
      {half(BOTTOM, 1)}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ opacity: open ? 0 : 1, transition: "opacity .2s" }}>
        <polyline
          points={TEAR.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="none"
          stroke="#120c0a"
          vectorEffect="non-scaling-stroke"
          style={{ strokeWidth: 5, strokeDasharray: 300, strokeDashoffset: 300, animation: "tear-draw .6s cubic-bezier(.6,0,.2,1) .1s forwards" }}
          pathLength={300}
        />
      </svg>
    </div>
  );
}
