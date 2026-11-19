// A head drawn at its evolution stage, with effects layered on the existing art:
//   1 Dormant  grey and asleep        2 Awake   colour
//   3 Seeing   pulsing ring           4 Feral   speed burst, shakes on hover
//   5 Evolved  halo, faster burst, crown
// small: thumbnails, without the z's and the crown
export function EvoHead({ img, stage, className = "w-40", label, small = false }: { img: string; stage: number; className?: string; label?: string; small?: boolean }) {
  return (
    <div className={`evo aspect-square ${className}`} data-stage={stage} role={label ? "img" : undefined} aria-label={label}>
      {stage >= 4 && <span className="evo-burst" aria-hidden="true" />}
      {stage >= 5 && <span className="evo-halo" aria-hidden="true" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img} alt="" draggable={false} className="evo-img h-full w-full rounded-full border-4 border-ink bg-sand object-cover" />
      {stage === 1 && !small && (
        <span aria-hidden="true">
          <span className="evo-z text-[0.9em]">z</span>
          <span className="evo-z text-[0.7em]" style={{ ["--d" as string]: "1.3s" }}>
            z
          </span>
        </span>
      )}
      {stage >= 5 && !small && (
        <span className="evo-crown chip bg-violet text-[0.55em] text-bone" aria-hidden="true">
          <span className="inline-block skew-x-[9deg]">Evolved</span>
        </span>
      )}
    </div>
  );
}
