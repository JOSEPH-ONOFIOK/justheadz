"use client";

import { useEffect, useRef, useState } from "react";
import { GAME } from "@/lib/evolve";
import { poke } from "@/lib/sound";

// Feed the Head: your head slides along the bottom; catch what falls.
//   🧠 +1   👁️ +3   💀 costs a life
// 30 seconds or three skulls, whichever comes first. Speeds up as it goes.
type Item = { x: number; y: number; vy: number; kind: 0 | 1 | 2; r: number };
const KINDS = [
  { emoji: "🧠", score: 1, pitch: 300 },
  { emoji: "👁️", score: 3, pitch: 640 },
  { emoji: "💀", score: 0, pitch: 80 },
];
const H = 380;

type Phase = "idle" | "play" | "over";

export function FeedGame({
  img,
  left,
  onStart,
  onFinish,
}: {
  img: string;
  left: number; // points the game can still earn today
  onStart: () => Promise<{ error?: string }>;
  onFinish: (score: number) => Promise<{ error?: string; gained?: number }>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [hud, setHud] = useState({ score: 0, lives: GAME.lives, time: GAME.seconds });
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const stop = useRef<() => void>(() => {});

  useEffect(() => () => stop.current(), []);

  async function start() {
    setError(null);
    setResult(null);
    setBusy(true);
    const r = await onStart();
    setBusy(false);
    if (r.error) return setError(r.error);
    setPhase("play");
    run();
  }

  function run() {
    const c = canvas.current!;
    const g = c.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = wrap.current!.clientWidth;
    const size = () => {
      W = wrap.current!.clientWidth;
      c.width = W * dpr;
      c.height = H * dpr;
      c.style.width = `${W}px`;
      c.style.height = `${H}px`;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();

    const head = new Image();
    head.src = img;
    const R = 34; // head radius
    let px = W / 2;
    let target = W / 2;
    const keys = { l: false, r: false };
    const items: Item[] = [];
    let score = 0;
    let lives: number = GAME.lives;
    let chomp = 0; // mouth flash after a catch
    let hurt = 0;
    const t0 = performance.now();
    let last = t0;
    let nextSpawn = t0 + 400;
    let raf = 0;
    let ended = false;

    const point = (e: PointerEvent) => {
      const b = c.getBoundingClientRect();
      target = Math.max(R, Math.min(W - R, e.clientX - b.left));
    };
    const key = (down: boolean) => (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") keys.l = down;
      else if (e.key === "ArrowRight" || e.key === "d") keys.r = down;
      else return;
      e.preventDefault();
    };
    const kd = key(true);
    const ku = key(false);
    c.addEventListener("pointermove", point);
    c.addEventListener("pointerdown", point);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("resize", size);

    const cleanup = () => {
      cancelAnimationFrame(raf);
      c.removeEventListener("pointermove", point);
      c.removeEventListener("pointerdown", point);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("resize", size);
    };
    stop.current = () => {
      ended = true;
      cleanup();
    };

    const finish = async () => {
      if (ended) return;
      ended = true;
      cleanup();
      setPhase("over");
      setBusy(true);
      const r = await onFinish(score);
      setBusy(false);
      if (r.error) setError(r.error);
      else setResult(r.gained ? `+${r.gained} evo points` : "Daily game points maxed. It still counts for your best score.");
    };

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const elapsed = (now - t0) / 1000;
      const p = Math.min(elapsed / GAME.seconds, 1); // 0 → 1 over the round

      // move
      if (keys.l) target -= 520 * dt;
      if (keys.r) target += 520 * dt;
      target = Math.max(R, Math.min(W - R, target));
      px += (target - px) * Math.min(1, dt * 14);

      // spawn: faster and heavier on skulls as time goes on
      if (now >= nextSpawn) {
        const roll = Math.random();
        const kind = (roll < 0.14 + p * 0.16 ? 2 : roll < 0.3 + p * 0.1 ? 1 : 0) as Item["kind"];
        items.push({ x: 20 + Math.random() * (W - 40), y: -20, vy: 150 + p * 210 + Math.random() * 60, kind, r: 16 });
        nextSpawn = now + 640 - p * 360;
      }

      // fall + catch
      const hy = H - R - 8;
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        it.y += it.vy * dt;
        if (Math.hypot(it.x - px, it.y - hy) < R + it.r - 4) {
          items.splice(i, 1);
          poke(KINDS[it.kind].pitch, it.kind === 2);
          if (it.kind === 2) {
            lives -= 1;
            hurt = 0.35;
          } else {
            score += KINDS[it.kind].score;
            chomp = 0.18;
          }
        } else if (it.y > H + 30) items.splice(i, 1);
      }
      chomp = Math.max(0, chomp - dt);
      hurt = Math.max(0, hurt - dt);

      // draw
      g.clearRect(0, 0, W, H);
      g.fillStyle = hurt > 0 ? "#ad3557" : "#fff3df";
      g.fillRect(0, 0, W, H);
      g.strokeStyle = "rgba(18,12,10,0.08)";
      g.lineWidth = 2;
      for (let x = -H; x < W; x += 22) {
        g.beginPath();
        g.moveTo(x, H);
        g.lineTo(x + H * 0.55, 0);
        g.stroke();
      }
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = "30px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
      for (const it of items) g.fillText(KINDS[it.kind].emoji, it.x, it.y);

      const s = 1 + chomp * 1.4;
      g.save();
      g.translate(px, hy);
      g.scale(s, s);
      g.beginPath();
      g.arc(0, 0, R, 0, Math.PI * 2);
      g.fillStyle = "#f8d8a7";
      g.fill();
      g.save();
      g.clip();
      if (head.complete && head.naturalWidth) g.drawImage(head, -R, -R, R * 2, R * 2);
      g.restore();
      g.lineWidth = 4;
      g.strokeStyle = "#120c0a";
      g.stroke();
      g.restore();

      const time = Math.max(0, Math.ceil(GAME.seconds - elapsed));
      setHud((h) => (h.score === score && h.lives === lives && h.time === time ? h : { score, lives, time }));

      if (lives <= 0 || elapsed >= GAME.seconds) return void finish();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }

  return (
    <div>
      <div ref={wrap} className="relative overflow-hidden border-4 border-ink bg-bone" style={{ height: H }}>
        <canvas ref={canvas} className={`block h-full w-full touch-none ${phase === "play" ? "cursor-none" : ""}`} aria-label="Feed the Head game. Move with the mouse, touch, or the arrow keys." />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between p-3 font-display text-lg">
          <span>{hud.score} pts</span>
          <span aria-label={`${hud.lives} lives`}>{"♥".repeat(Math.max(hud.lives, 0))}<span className="opacity-25">{"♥".repeat(GAME.lives - Math.max(hud.lives, 0))}</span></span>
          <span>{hud.time}s</span>
        </div>
        {phase !== "play" && (
          <div className="absolute inset-0 grid place-items-center bg-bone/85 p-6 text-center">
            <div>
              <p className="display text-3xl">{phase === "over" ? `${hud.score} points` : "Feed the Head"}</p>
              <p className="mx-auto mt-2 max-w-xs text-sm font-semibold">
                {phase === "over"
                  ? busy
                    ? "Weighing the brains…"
                    : (result ?? "")
                  : "Catch 🧠 (+1) and 👁️ (+3). Dodge 💀. Mouse, touch or arrow keys."}
              </p>
              <button type="button" onClick={start} disabled={busy} className="btn mt-4 bg-wine text-sm text-bone disabled:opacity-60">
                <span>{phase === "over" ? "Play again" : "Play"}</span>
              </button>
              <p className="mt-3 text-xs font-bold opacity-70">{left > 0 ? `Up to ${left} more evo points from the game today.` : "Game points maxed for today. Play for your best score."}</p>
            </div>
          </div>
        )}
      </div>
      {error && <p className="pop-in mt-2 text-sm font-bold text-wine">{error}</p>}
    </div>
  );
}
