"use client";

import { useState } from "react";
import { PILE, type Head } from "@/lib/heads";
import { poke, setSound, useSound } from "@/lib/sound";
import { PageHead } from "./PageHead";

const S = 1200; // collage.webp is the 1500px art cropped to 1200px at (160, 160)
const OFF = 160;
const pct = (n: number) => `${(n / S) * 100}%`;
const at = (n: number) => pct(n - OFF);

export function HeadPile() {
  const [hover, setHover] = useState<Head | null>(null);
  const [picked, setPicked] = useState<Head>(PILE[3]);
  const [pokes, setPokes] = useState(0);
  const [bump, setBump] = useState(0);
  const sound = useSound();

  const live = hover ?? picked;

  const hit = (h: Head) => {
    setPicked(h);
    setPokes((n) => n + 1);
    setBump((n) => n + 1);
    poke(h.pitch, h.id === "scream");
  };

  return (
    <section className="relative mx-auto max-w-7xl px-4 pt-32 pb-24 sm:px-8 sm:pt-40 sm:pb-32">
      <PageHead
        label="Exhibit A"
        title="The Pile"
        blurb="Every head in here has a temper. Hover or tap one to wake it, click to poke it."
        img="/art/heads/scream.webp"
        morph="door-pile"
      >
        <button
          type="button"
          onClick={() => setSound(!sound)}
          className={`chip shrink-0 text-sm ${sound ? "bg-ink text-sand" : "bg-bone"}`}
          aria-pressed={sound}
        >
          Sound {sound ? "on" : "off"}
        </button>
      </PageHead>

      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.25fr_1fr]">
        {/* the collage */}
        <div className="relative mx-auto aspect-square w-full min-w-0 max-w-[680px] select-none" onPointerLeave={() => setHover(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/art/collage.webp" alt="The JustHeadz pile: nine heads crammed together, screaming, sulking and smirking" className="absolute inset-0 h-full w-full" draggable={false} />

          {live && (
            <div key={live.id + bump} className="pointer-events-none absolute inset-0" style={{ filter: "drop-shadow(6px 8px 0 #120c0a)" }}>
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: "url(/art/collage.webp)",
                  backgroundSize: "100% 100%",
                  clipPath: `circle(${pct(live.r)} at ${at(live.x)} ${at(live.y)})`,
                  transformOrigin: `${at(live.x)} ${at(live.y)}`,
                  animation: "wobble .55s var(--spring) both",
                }}
              />
            </div>
          )}

          {PILE.map((h) => (
            <button
              key={h.id}
              type="button"
              aria-label={`Poke ${h.name}, ${h.mood}`}
              onPointerEnter={() => setHover(h)}
              onFocus={() => setHover(h)}
              onBlur={() => setHover(null)}
              onClick={() => hit(h)}
              className="focus-ink absolute rounded-full"
              style={{
                left: at(h.x - h.r * 0.8),
                top: at(h.y - h.r * 0.8),
                width: pct(h.r * 1.6),
                height: pct(h.r * 1.6),
                cursor: "grab",
              }}
            />
          ))}

          {hover && (
            <div
              key={hover.id}
              className="pointer-events-none absolute z-10 whitespace-nowrap border-[3px] border-ink bg-bone px-3 py-1.5 text-sm font-bold shadow-[4px_4px_0_#120c0a]"
              style={{
                left: at(hover.x),
                top: `calc(${at(hover.y - hover.r)} + 10px)`,
                animation: "bubble .3s var(--spring) both",
                translate: "0 -100%",
              }}
            >
              <span className="display mr-2 text-wine">{hover.name}</span>
              {hover.mood}
            </div>
          )}
        </div>

        {/* the file on whoever's awake */}
        <div className="relative min-w-0">
          <article key={picked.id + bump} className="pop-in ink ink-shadow relative bg-bone p-5 sm:p-7" style={{ clipPath: "polygon(0 4%, 100% 0, 100% 100%, 0 100%)" }}>
            <div className="flex items-center gap-5 pt-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={picked.img} alt="" className="ink h-20 w-20 shrink-0 rounded-full bg-sand object-cover sm:h-36 sm:w-36" />
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-wine">{picked.mood}</p>
                <h3 className="display text-3xl sm:text-5xl">{picked.name}</h3>
              </div>
            </div>
            <p className="mt-6 border-l-[6px] border-wine pl-4 text-xl font-bold leading-tight [overflow-wrap:anywhere] sm:text-2xl">&ldquo;{picked.line}&rdquo;</p>
            <div className="hatch mt-6 w-40" />
          </article>
          <p className="mt-6 font-medium" aria-live="polite">
            {pokes === 0 ? "Nobody's been poked yet." : `You've poked ${pokes} ${pokes === 1 ? "head" : "heads"}. They're keeping count.`}
          </p>
        </div>
      </div>
    </section>
  );
}
