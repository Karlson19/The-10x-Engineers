import { arcPath, tickPath } from "@/components/brand/geometry";
import { cn } from "@/lib/utils";

const SIZE = 48;
const CENTRE = SIZE / 2;
const RING_RADIUS = 21;
const MONOGRAM_RADIUS = 13.5;

/**
 * The mark is a workshop seal that doubles as a C and as a progress ring: the
 * ink arc is the monogram, the copper segment is the stage a job has reached.
 * It is the same idea as the status timeline, which is the product's signature
 * screen, reduced to something that still reads at 20px in a header.
 *
 * The ring and the monogram use currentColor so the mark sits correctly on
 * paper, on pine and on ink without a second copy of the file.
 */
export function LogoMark({
  className,
  accentClassName = "stroke-accent",
  title,
}: {
  className?: string;
  accentClassName?: string;
  title?: string;
}) {
  // Quarter marks at the compass points, the way an instrument face is divided.
  const ticks = [0, 90, 180, 270].map((degrees) =>
    tickPath(CENTRE, CENTRE, RING_RADIUS - 3.25, 2.25, degrees),
  );

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={cn("size-10", className)}
      fill="none"
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <circle
        cx={CENTRE}
        cy={CENTRE}
        r={RING_RADIUS}
        stroke="currentColor"
        strokeOpacity={0.28}
        strokeWidth={1.5}
      />

      {ticks.map((d) => (
        <path key={d} d={d} stroke="currentColor" strokeOpacity={0.28} strokeWidth={1.5} />
      ))}

      {/* The copper segment: one stage of the ring, lit. */}
      <path
        d={arcPath(CENTRE, CENTRE, RING_RADIUS, -76, -14)}
        className={accentClassName}
        strokeWidth={3}
        strokeLinecap="round"
      />

      {/* The monogram, open to the right so it reads as a C. */}
      <path
        d={arcPath(CENTRE, CENTRE, MONOGRAM_RADIUS, 42, 318)}
        stroke="currentColor"
        strokeWidth={5.5}
        strokeLinecap="round"
      />
    </svg>
  );
}
