"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X_URL } from "@/lib/site";

const LINKS = [
  { href: "/pile", label: "The Pile" },
  { href: "/moods", label: "Moods" },
  { href: "/whitelist", label: "Whitelist" },
];

export function Nav() {
  const path = usePathname();
  // the moods page sits on maroon, so the nav flips to light text there
  const dark = path === "/moods";
  return (
    <header className={`absolute inset-x-0 top-0 z-30 transition-colors ${dark ? "text-sand" : "text-ink"}`}>
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-8 sm:py-6">
        <Link href="/" className="display focus-ink shrink-0 text-xl transition-transform duration-300 hover:-rotate-3 hover:scale-105 sm:text-3xl" aria-label="JustHeadz home">
          JustHeadz
        </Link>
        <div className="flex items-center gap-3 sm:gap-6">
          {LINKS.map((l) => {
            const on = path === l.href;
            return (
              <Link key={l.href} href={l.href} aria-current={on ? "page" : undefined} className={`nav-link focus-ink hidden font-bold uppercase tracking-wide md:inline ${on ? "on" : ""}`}>
                {l.label}
              </Link>
            );
          })}
          {X_URL ? (
            <a href={X_URL} target="_blank" rel="noreferrer" className="btn bg-ink px-3 py-2 text-xs text-sand sm:text-sm" aria-label="JustHeadz on X">
              <span>X</span>
            </a>
          ) : null}
          {path !== "/whitelist" && (
            <Link href="/whitelist" className="btn bg-wine px-3 py-2 text-xs text-bone md:hidden">
              <span>Apply</span>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
