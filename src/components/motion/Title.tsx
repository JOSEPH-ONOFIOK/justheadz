import type { CSSProperties, ElementType } from "react";

// Big display heading whose letters drop in one by one with a bounce.
export function Title({
  text,
  as: Tag = "h1",
  className = "",
  delay = 0,
  style,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  delay?: number;
  style?: CSSProperties;
}) {
  let i = 0;
  return (
    <Tag className={`display ${className}`} aria-label={text} style={style}>
      {text.split(" ").map((word, w) => (
        <span key={w} aria-hidden="true" className="inline-block whitespace-nowrap">
          {[...word].map((ch) => {
            const n = i++;
            return (
              <span key={n} className="letter-drop inline-block" style={{ animationDelay: `calc(${delay}ms * var(--wait, 1) + ${n * 38}ms)` }}>
                {ch}
              </span>
            );
          })}
          {w < text.split(" ").length - 1 && <span className="inline-block w-[0.28em]" />}
        </span>
      ))}
    </Tag>
  );
}
