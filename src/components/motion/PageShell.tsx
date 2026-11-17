import { ViewTransition, type ReactNode } from "react";

// Wrap each page so route changes play the slash wipe (see globals.css).
// Must live in page.tsx, not the layout: layouts never enter or exit.
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="slash-in" exit="slash-out" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}

// Same image on two pages with the same name morphs between them.
export function Morph({ name, children }: { name: string; children: ReactNode }) {
  return (
    <ViewTransition name={name} share="morph" default="none">
      {children}
    </ViewTransition>
  );
}
