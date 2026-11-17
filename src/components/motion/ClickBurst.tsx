"use client";

import { useEffect } from "react";

// Comic ink burst wherever you click: short strokes fly out and vanish.
export function ClickBurst() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const wrap = document.createElement("div");
      wrap.className = "burst";
      wrap.style.left = `${e.clientX}px`;
      wrap.style.top = `${e.clientY}px`;
      const spin = Math.random() * 45;
      for (let i = 0; i < 8; i++) {
        const s = document.createElement("i");
        s.style.setProperty("--a", `${spin + i * 45}deg`);
        s.style.setProperty("--d", `${26 + Math.random() * 16}px`);
        wrap.appendChild(s);
      }
      document.body.appendChild(wrap);
      setTimeout(() => wrap.remove(), 500);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);
  return null;
}
