"use client";

import { useState, type PointerEvent } from "react";
import { ALL_HEADS, MOODS, type Mood } from "@/lib/heads";
import { PageHead } from "./PageHead";

const present = MOODS.filter((m) => ALL_HEADS.some((h) => h.mood === m));

function tilt(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  el.style.setProperty("--rx", `${(-y * 14).toFixed(2)}deg`);
  el.style.setProperty("--ry", `${(x * 16).toFixed(2)}deg`);
}

function untilt(e: PointerEvent<HTMLElement>) {
  e.currentTarget.style.setProperty("--rx", "0deg");
  e.currentTarget.style.setProperty("--ry", "0deg");
}

export function MoodBoard() {
  const [mood, setMood] = useState<Mood | "All">("All");
  const heads = mood === "All" ? ALL_HEADS : ALL_HEADS.filter((h) => h.mood === mood);

  return (
    <section className="relative min-h-dvh bg-maroon pt-32 pb-28 text-bone sm:pt-40 sm:pb-36" style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 3vw), 0 100%)" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <PageHead
          dark
          label="Exhibit B"
          title="Pick a mood"
          blurb="No traits list, no rarity table. Just how they feel today. Find the face you're making right now."
          img="/art/pfp-captain.webp"
          morph="door-moods"
        />

        <div className="flex flex-wrap gap-3" role="group" aria-label="Filter heads by mood">
          {(["All", ...present] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMood(m)}
              aria-pressed={mood === m}
              className={`chip text-sm sm:text-base ${mood === m ? "bg-sand text-ink" : "border-sand bg-transparent text-sand hover:bg-wine"}`}
            >
              {m}
            </button>
          ))}
        </div>

        <ul key={mood} className="mt-12 grid grid-cols-2 gap-5 sm:gap-8 md:grid-cols-3 lg:grid-cols-4">
          {heads.map((h, i) => (
            <li key={h.id} className="pop-in" style={{ animationDelay: `${i * 55}ms`, perspective: "900px" }}>
              <figure
                onPointerMove={tilt}
                onPointerLeave={untilt}
                className="group relative bg-sand text-ink shadow-[7px_7px_0_#120c0a] transition-transform duration-300"
                style={{
                  transform: `rotate(${i % 2 ? 1.5 : -1.5}deg) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))`,
                  border: "4px solid #120c0a",
                }}
              >
                <div className="overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={h.img}
                    alt={`${h.name}, a ${h.mood.toLowerCase()} JustHeadz head`}
                    loading="lazy"
                    className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3"
                    style={{ transitionTimingFunction: "var(--spring)" }}
                  />
                </div>
                <figcaption className="border-t-4 border-ink px-3 pt-2 pb-3">
                  <span className="block text-xs font-bold uppercase tracking-[0.18em] text-wine">{h.mood}</span>
                  <span className="display text-xl sm:text-2xl">{h.name}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
