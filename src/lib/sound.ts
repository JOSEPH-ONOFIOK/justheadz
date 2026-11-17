"use client";

import { useSyncExternalStore } from "react";

// Tiny synthesized pokes, no audio files. Off until the visitor turns it on.
let on = false;
let ctx: AudioContext | null = null;
const subs = new Set<() => void>();

export function setSound(v: boolean) {
  on = v;
  if (v && !ctx) ctx = new AudioContext();
  subs.forEach((f) => f());
}

export function useSound() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => on,
    () => false,
  );
}

export function poke(pitch: number, scream = false) {
  if (!on || !ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = scream ? "sawtooth" : "square";
  osc.frequency.setValueAtTime(pitch, t);
  if (scream) {
    osc.frequency.linearRampToValueAtTime(pitch * 1.6, t + 0.08);
    osc.frequency.linearRampToValueAtTime(pitch * 1.2, t + 0.45);
  } else {
    osc.frequency.exponentialRampToValueAtTime(pitch * 2.2, t + 0.05);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.7, t + 0.18);
  }
  const len = scream ? 0.5 : 0.2;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.08, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + len + 0.02);
}
