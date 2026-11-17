import { Morph } from "./motion/PageShell";
import { Title } from "./motion/Title";

// Top of each inner page: label, bouncing title, blurb and the head sticker
// that morphs in from the matching door card on the home page.
export function PageHead({
  label,
  title,
  blurb,
  img,
  morph,
  dark = false,
  children,
}: {
  label: string;
  title: string;
  blurb: string;
  img: string;
  morph: string;
  dark?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-10 flex flex-col gap-6 sm:mb-14 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-end gap-5">
        <Morph name={morph}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img}
            alt=""
            className="bob h-20 w-20 shrink-0 rounded-full border-4 border-ink bg-sand object-cover shadow-[4px_5px_0_#120c0a] sm:h-28 sm:w-28"
            style={{ ["--r" as string]: "-8deg" }}
          />
        </Morph>
        <div>
          <p className={`mb-2 font-bold uppercase tracking-[0.2em] ${dark ? "text-sand" : "text-wine"}`}>{label}</p>
          <Title text={title} className={`text-[clamp(2.8rem,9vw,7.5rem)] ${dark ? "text-sand" : ""}`} />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <p className="max-w-xs font-medium">{blurb}</p>
        {children}
      </div>
    </div>
  );
}
