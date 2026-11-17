"use client";

import { useEffect, useId, useRef } from "react";

// The banner art is 2646 x 994. The original irises were painted out of
// banner-base.webp and eyes-mask.png is white where the eye openings are,
// so we can redraw the irises and lids on top and move them freely.
const W = 2646;
const H = 994;

type Eye = {
  id: string;
  px: number; // pupil centre
  py: number;
  // upper lid curve: y = a(x-cx)^2 + b(x-cx) + c
  cx: number;
  lid: [number, number, number];
  x0: number;
  x1: number;
  bottom: number;
};

const EYES: Eye[] = [
  { id: "l", px: 1285, py: 508, cx: 1285.5, lid: [0.002409, 0.052327, 484.775], x0: 1140, x1: 1420, bottom: 575 },
  { id: "r", px: 1660, py: 480, cx: 1655, lid: [0.000634, -0.353263, 453.48], x0: 1515, x1: 1785, bottom: 545 },
];

const IRIS = 86;
const PUPIL = 40;
// How far the iris may travel inside the socket (art units)
const RANGE_X = 46;
const RANGE_Y = 16;

export type EyeMode = "track" | "scan" | "narrow" | "wide" | "down";

const lidY = (e: Eye, x: number) => e.lid[0] * (x - e.cx) ** 2 + e.lid[1] * (x - e.cx) + e.lid[2];

// Polygon that covers everything above the lid curve, pushed down by `drop`
function lidPath(e: Eye, drop: number) {
  const pts: string[] = [`M${e.x0},${lidY(e, e.x0) - 140}`, `L${e.x1},${lidY(e, e.x1) - 140}`];
  for (let x = e.x1; x >= e.x0; x -= 10) pts.push(`L${x},${(lidY(e, x) + drop).toFixed(1)}`);
  return pts.join(" ") + "Z";
}

const LID_CLOSED = 95;
const LID_FOR: Record<EyeMode, number> = { track: 0, scan: 30, narrow: 38, wide: -6, down: 14 };

export function Eyes({
  mode = "track",
  viewBox = `0 0 ${W} ${H}`,
  className,
  label = "A JustHeadz character peeking through a slash in the page",
}: {
  mode?: EyeMode;
  viewBox?: string;
  className?: string;
  label?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const svg = useRef<SVGSVGElement>(null);
  const irises = useRef<(SVGGElement | null)[]>([]);
  const lids = useRef<(SVGPathElement | null)[]>([]);
  const modeRef = useRef(mode);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let target = { x: 0, y: 0 };
    let cur = { x: 0, y: 0 };
    let lid = 0;
    let lastMove = 0;
    let blinkUntil = 0;
    let nextBlink = performance.now() + 1800;
    let raf = 0;
    let visible = true;

    const onMove = (ev: PointerEvent) => {
      lastMove = performance.now();
      const r = el.getBoundingClientRect();
      const vb = el.viewBox.baseVal;
      // centre point between the two eyes, in screen space
      const ex = r.left + ((1470 - vb.x) / vb.width) * r.width;
      const ey = r.top + ((495 - vb.y) / vb.height) * r.height;
      const dx = ev.clientX - ex;
      const dy = ev.clientY - ey;
      const d = Math.hypot(dx, dy) || 1;
      const reach = Math.min(d / 260, 1);
      target = { x: (dx / d) * reach, y: (dy / d) * reach };
    };

    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(tick);
    });
    io.observe(el);

    function tick(now: number) {
      raf = 0;
      if (!visible) return;
      const m = modeRef.current;
      let t = target;
      if (m === "scan") {
        t = { x: Math.sin(now / 160) * 0.95, y: 0.15 };
      } else if (m === "down") {
        t = { x: 0, y: 1 };
      } else if (now - lastMove > 3200) {
        // nobody around: look about on our own
        t = { x: Math.sin(now / 1900) * 0.7, y: Math.sin(now / 1300) * 0.35 };
      }
      const k = still ? 1 : m === "scan" ? 0.35 : 0.14;
      cur = { x: cur.x + (t.x - cur.x) * k, y: cur.y + (t.y - cur.y) * k };

      // blinking
      if (!still && now > nextBlink) {
        blinkUntil = now + 150;
        nextBlink = now + 2200 + Math.random() * 3800;
      }
      const want = now < blinkUntil ? LID_CLOSED : LID_FOR[m];
      lid += (want - lid) * (now < blinkUntil ? 0.55 : 0.18);

      EYES.forEach((e, i) => {
        irises.current[i]?.setAttribute(
          "transform",
          `translate(${(e.px + cur.x * RANGE_X).toFixed(1)} ${(e.py + cur.y * RANGE_Y).toFixed(1)})`,
        );
        lids.current[i]?.setAttribute("d", lidPath(e, lid));
      });
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <svg ref={svg} viewBox={viewBox} className={className} role="img" aria-label={label} preserveAspectRatio="xMidYMid slice">
      <defs>
        <mask id={`m${uid}`} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
          <image href="/art/eyes-mask.png" width={W} height={H} />
        </mask>
        <clipPath id={`h${uid}`}>
          <rect x={-IRIS} y={-IRIS} width={IRIS + 6} height={IRIS * 2} />
        </clipPath>
      </defs>
      <image href="/art/banner-base.webp" width={W} height={H} />
      <g mask={`url(#m${uid})`}>
        {EYES.map((e, i) => (
          <g key={e.id}>
            <g
              ref={(n) => {
                irises.current[i] = n;
              }}
              transform={`translate(${e.px} ${e.py})`}
            >
              <circle r={IRIS} fill="#7146c5" />
              <circle r={IRIS} fill="#2c23ba" clipPath={`url(#h${uid})`} />
              <circle r={IRIS} fill="none" stroke="#120c0a" strokeWidth="5" opacity=".35" />
              <circle r={PUPIL} fill="#000" />
              <rect x={-26} y={-24} width={13} height={46} rx={6.5} fill="#fff" transform="rotate(28)" />
            </g>
            <path
              ref={(n) => {
                lids.current[i] = n;
              }}
              d={lidPath(e, 0)}
              fill="#120c0a"
            />
          </g>
        ))}
      </g>
    </svg>
  );
}
