import Link from "next/link";
import { SITE, X_URL } from "@/lib/site";

export function Footer() {
  return (
    <footer className="relative mt-auto overflow-hidden bg-ink pt-20 pb-8 text-sand" style={{ clipPath: "polygon(0 2.5vw, 100% 0, 100% 100%, 0 100%)" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <p className="display w-full text-[clamp(2.5rem,13.5vw,14rem)] leading-[0.8] text-sand">JustHeadz</p>
        <div className="mt-3 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="flex items-center gap-4">
            <span className="display text-2xl text-wine">{SITE.tagline}</span>
            <div className="hatch hatch-move w-32 [background:repeating-linear-gradient(-62deg,var(--sand)_0_4px,transparent_4px_11px)]" />
          </div>
          <div className="flex flex-wrap items-center gap-6 font-bold uppercase tracking-wide">
            <Link href="/pile" className="focus-ink hover:text-wine">The Pile</Link>
            <Link href="/moods" className="focus-ink hover:text-wine">Moods</Link>
            <Link href="/evolve" className="focus-ink hover:text-wine">Evolve</Link>
            <Link href="/claim" className="focus-ink hover:text-wine">Claim</Link>
            <Link href="/whitelist" className="focus-ink hover:text-wine">Whitelist</Link>
            {X_URL && (
              <a href={X_URL} target="_blank" rel="noreferrer" className="focus-ink hover:text-wine">
                X
              </a>
            )}
          </div>
        </div>
        <p className="mt-12 text-sm text-sand/60">© 2026 JustHeadz. Heads only.</p>
      </div>
    </footer>
  );
}
