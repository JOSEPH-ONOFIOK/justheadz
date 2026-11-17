"use client";

import { useEffect, useRef, useState } from "react";
import { poke } from "@/lib/sound";

// "Remember the faces": watch the heads light up, then tap them back in order.
// Three rounds, each longer and faster. One wrong face sends you back to round 1.
const FACES = [
  { id: "sad", img: "/art/heads/sad.webp", pitch: 220 },
  { id: "scream", img: "/art/heads/scream.webp", pitch: 520 },
  { id: "mad", img: "/art/heads/mad.webp", pitch: 110 },
  { id: "shook", img: "/art/heads/shook.webp", pitch: 660 },
  { id: "void", img: "/art/heads/void.webp", pitch: 60 },
  { id: "smug", img: "/art/heads/smug.webp", pitch: 330 },
];
const ROUNDS = [
  { len: 4, ms: 620 },
  { len: 6, ms: 500 },
  { len: 8, ms: 400 },
];

type Phase = "idle" | "watch" | "play" | "wrong" | "won";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const randomSeq = (n: number) => {
  const out: number[] = [];
  while (out.length < n) {
    const i = Math.floor(Math.random() * FACES.length);
    if (i !== out[out.length - 1]) out.push(i); // no face twice in a row
  }
  return out;
};

export function MemoryGame({ onStart, onWin }: { onStart: () => Promise<{ error?: string }>; onWin: () => Promise<{ error?: string }> }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [round, setRound] = useState(0);
  const [lit, setLit] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const seq = useRef<number[]>([]);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  async function show(r: number) {
    const { len, ms } = ROUNDS[r];
    seq.current = randomSeq(len);
    setRound(r);
    setStep(0);
    setPhase("watch");
    await wait(700);
    for (const i of seq.current) {
      if (!alive.current) return;
      setLit(i);
      poke(FACES[i].pitch);
      await wait(ms);
      setLit(null);
      await wait(ms * 0.35);
    }
    if (alive.current) setPhase("play");
  }

  async function start() {
    setError(null);
    const r = await onStart();
    if (r.error) return setError(r.error);
    show(0);
  }

  async function tap(i: number) {
    if (phase !== "play") return;
    poke(FACES[i].pitch);
    setLit(i);
    setTimeout(() => setLit((v) => (v === i ? null : v)), 180);
    if (seq.current[step] !== i) {
      setPhase("wrong");
      return;
    }
    const nextStep = step + 1;
    if (nextStep < seq.current.length) return setStep(nextStep);
    if (round + 1 < ROUNDS.length) {
      setPhase("watch");
      await wait(500);
      return show(round + 1);
    }
    setPhase("won");
    const res = await onWin();
    if (res.error) {
      setError(res.error);
      setPhase("idle");
    }
  }

  const status =
    phase === "idle"
      ? "Three rounds. Watch the faces light up, then tap them back in the same order."
      : phase === "watch"
        ? `Round ${round + 1}: watch closely…`
        : phase === "play"
          ? `Your turn. ${step} of ${ROUNDS[round].len}.`
          : phase === "wrong"
            ? "Wrong face. Back to round 1."
            : "All three rounds. The eyes are impressed.";

  return (
    <div>
      <div className="mb-3 flex items-center gap-2" aria-hidden="true">
        {ROUNDS.map((_, r) => (
          <span
            key={r}
            className={`h-3 w-10 -skew-x-12 border-2 border-ink transition-colors ${phase === "won" || r < round ? "bg-wine" : r === round && phase !== "idle" && phase !== "wrong" ? "bg-ink" : "bg-transparent"}`}
          />
        ))}
      </div>
      <div className={`grid max-w-sm grid-cols-3 gap-3 ${phase === "wrong" ? "shake" : ""}`}>
        {FACES.map((f, i) => (
          <button
            key={f.id}
            type="button"
            onClick={() => tap(i)}
            disabled={phase !== "play"}
            aria-label={`Face ${i + 1}`}
            className={`focus-ink aspect-square overflow-hidden rounded-full border-4 border-ink bg-sand transition-transform duration-150 ${
              lit === i ? "scale-110 -rotate-6 shadow-[0_0_0_6px_var(--wine)]" : phase === "play" ? "hover:scale-105" : ""
            } ${phase === "watch" && lit !== i ? "opacity-50 grayscale" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.img} alt="" className="h-full w-full object-cover" draggable={false} />
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm font-bold" aria-live="polite">
        {status}
      </p>
      {(phase === "idle" || phase === "wrong") && (
        <button type="button" onClick={phase === "idle" ? start : () => show(0)} className="btn mt-3 bg-wine text-sm text-bone">
          <span>{phase === "idle" ? "Start" : "Try again"}</span>
        </button>
      )}
      {error && <p className="mt-2 text-sm font-bold text-wine">{error}</p>}
    </div>
  );
}
