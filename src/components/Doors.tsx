import Link from "next/link";
import { Morph } from "./motion/PageShell";
import { Reveal } from "./motion/Reveal";
import { Title } from "./motion/Title";

export const DOORS = [
  { href: "/pile", n: "01", title: "The Pile", blurb: "Nine heads with tempers. Wake one up.", img: "/art/heads/scream.webp", morph: "door-pile", bg: "bg-wine text-bone", tilt: -2 },
  { href: "/moods", n: "02", title: "Moods", blurb: "Find the face you're making right now.", img: "/art/pfp-captain.webp", morph: "door-moods", bg: "bg-maroon text-bone", tilt: 1.5 },
  { href: "/whitelist", n: "03", title: "Whitelist", blurb: "Six steps, in order. It isn't easy.", img: "/art/pfp-sailor.webp", morph: "door-whitelist", bg: "bg-ink text-sand", tilt: -1 },
] as const;

export function Doors() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-8 sm:py-32">
      <Reveal>
        <p className="mb-2 font-bold uppercase tracking-[0.2em] text-wine">Pick a door</p>
        <Title as="h2" text="Get inside their heads" className="text-[clamp(2.6rem,7vw,6rem)]" />
      </Reveal>

      <div className="mt-14 grid gap-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
        {DOORS.map((d, i) => (
          <Reveal key={d.href} delay={i * 120}>
            <Link
              href={d.href}
              className={`door group focus-ink relative block border-4 border-ink p-6 pt-24 shadow-[8px_8px_0_#120c0a] sm:p-8 sm:pt-28 ${d.bg}`}
              style={{ ["--t" as string]: `${d.tilt}deg` }}
            >
              <div className="door-head absolute -top-10 right-6 w-28 sm:w-32">
                <Morph name={d.morph}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.img} alt="" className="aspect-square w-full rounded-full border-4 border-ink bg-sand object-cover shadow-[4px_5px_0_#120c0a]" />
                </Morph>
              </div>
              <div><span className="display text-6xl opacity-25">{d.n}</span></div>
              <h3 className="display mt-2 text-4xl [overflow-wrap:anywhere] xl:text-5xl">{d.title}</h3>
              <p className="mt-3 text-lg font-medium">{d.blurb}</p>
              <span className="door-arrow display mt-8 inline-flex items-center gap-3 text-xl">
                Go in
                <svg width="40" height="18" viewBox="0 0 40 18" fill="none" aria-hidden="true">
                  <path d="M0 9h36M28 1l9 8-9 8" stroke="currentColor" strokeWidth="4" />
                </svg>
              </span>
              <div className="speedlines pointer-events-none absolute inset-0 opacity-0 mix-blend-overlay transition-opacity duration-300 group-hover:opacity-30" />
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
