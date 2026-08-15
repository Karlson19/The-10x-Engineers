import { cn } from "@/lib/utils";

/**
 * A car on a slow turntable, drawn rather than modelled.
 *
 * A real 3D model was the obvious idea and the wrong one: a viewer plus a mesh
 * is hundreds of kilobytes before it draws a pixel, and our customers are on
 * mid range Android phones over 3G. It would also be the same generic car for
 * every vehicle on the list, which is worse than no picture at all.
 *
 * This is a few kilobytes of inline SVG, it turns with transform and opacity
 * only, and the silhouette changes with the vehicle, so a saloon and a four by
 * four are told apart at a glance.
 */

export type BodyType = "saloon" | "suv" | "hatchback" | "pickup" | "van";

/**
 * Worked out from the model name, falling back to the make. Deliberately a
 * short list of what is actually on the road in Kumasi rather than an attempt
 * at every car ever made, and anything unrecognised gets the saloon, which is
 * the safest guess.
 */
const MODEL_HINTS: ReadonlyArray<{ pattern: RegExp; body: BodyType }> = [
  { pattern: /hilux|ranger|navara|d-?max|pick.?up|tacoma/i, body: "pickup" },
  { pattern: /hiace|sprinter|transit|urvan|van|bus/i, body: "van" },
  {
    pattern:
      /rav.?4|x-?trail|sportage|santa.?fe|tucson|crv|cr-?v|highlander|prado|land.?cruiser|4runner|pajero|escape|edge|explorer|sorento|terrain|equinox|rogue|forester|outlander|juke|kicks|ecosport|creta|seltos/i,
    body: "suv",
  },
  { pattern: /golf|polo|yaris|fit|jazz|march|vitz|i10|i20|picanto|swift|micra/i, body: "hatchback" },
];

export function bodyTypeFor(make: string, model: string): BodyType {
  const haystack = `${make} ${model}`;

  for (const hint of MODEL_HINTS) {
    if (hint.pattern.test(haystack)) {
      return hint.body;
    }
  }

  return "saloon";
}

/**
 * Each body is one path over the same 200 by 76 stage, so the wheels and the
 * ground line stay put and only the shell changes.
 */
const BODY_PATHS: Readonly<Record<BodyType, string>> = {
  // Three boxes: low bonnet, glasshouse, and a boot that steps down at the back.
  saloon:
    "M12 53 L15 41 Q17 35 25 34 L60 31 Q69 22 84 21 L116 21 Q130 22 139 31 L170 35 Q184 38 187 45 L188 53 Z",
  // Tall and square: a flat roof carried right to the back and a blunt tail.
  suv:
    "M13 53 L14 33 Q15 25 24 24 L56 21 Q64 11 80 10 L134 10 Q150 11 156 22 L157 24 L178 27 Q188 29 189 38 L189 53 Z",
  // Short, with the roof falling straight into the tail. No boot.
  hatchback:
    "M18 53 L21 40 Q23 34 30 33 L58 29 Q66 20 80 19 L112 19 Q126 21 134 32 L146 36 Q158 39 160 46 L161 53 Z",
  // Cab forward, then an open bed with a dropped side and a tailgate.
  pickup:
    "M13 53 L15 36 Q16 28 24 27 L52 24 Q60 13 76 12 L104 12 Q116 14 122 26 L124 34 L128 34 L128 32 L186 32 L186 53 Z",
  // One tall slab, barely any bonnet.
  van:
    "M13 53 L14 24 Q15 13 26 12 L60 10 Q70 9 84 9 L152 9 Q172 11 181 25 L188 41 L188 53 Z",
};

/** Where the wheels sit for each body, because a pickup rides longer. */
const WHEELS: Readonly<Record<BodyType, readonly [number, number]>> = {
  saloon: [52, 152],
  suv: [50, 150],
  hatchback: [50, 140],
  pickup: [48, 156],
  van: [48, 156],
};

export function VehicleSilhouette({
  make,
  model,
  className,
  animate = true,
}: {
  make: string;
  model: string;
  className?: string;
  /**
   * Off where the drawing is small and repeated, such as the vehicle picker in
   * the booking wizard. A row of turntables competing for attention is noise,
   * and it is wasted work on a phone.
   */
  animate?: boolean;
}) {
  const body = bodyTypeFor(make, model);
  const [frontX, rearX] = WHEELS[body];
  const wheelY = body === "suv" || body === "pickup" || body === "van" ? 52 : 53;
  const wheelR = body === "suv" || body === "pickup" ? 13 : 11.5;

  return (
    // The perspective lives on the wrapper so the turn reads as depth rather
    // than a squash.
    <div className={cn(animate && "car-stage", className)} aria-hidden>
      <svg viewBox="0 0 200 76" className={cn("w-full", animate && "car-turn")} fill="none">
        {/* The turntable, and the shadow that tightens as the car comes round. */}
        <ellipse cx="100" cy="66" rx="82" ry="7" className="fill-foreground/[0.07]" />
        <ellipse cx="100" cy="66" rx="60" ry="4.5" className={cn("fill-foreground/10", animate && "car-shadow")} />

        <path d={BODY_PATHS[body]} className="fill-primary" />

        {/* Glass, sitting just inside the roof line of each shell. */}
        <path
          d={
            body === "van"
              ? "M28 19 Q29 15 37 14 L80 13 L80 31 L28 31 Z"
              : body === "pickup"
                ? "M60 20 Q66 16 78 16 L102 16 Q111 18 116 27 L60 29 Z"
                : body === "suv"
                  ? "M62 18 Q68 14 80 14 L132 14 Q144 15 149 23 L62 27 Z"
                  : body === "hatchback"
                    ? "M64 27 Q70 23 81 23 L110 23 Q121 25 128 33 L64 35 Z"
                    : "M66 29 Q72 25 84 25 L114 25 Q126 26 133 33 L66 36 Z"
          }
          className="fill-background/85"
        />

        {/* Wheels. They turn the whole time, which is most of the life in this. */}
        {[rearX, frontX].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy={wheelY} r={wheelR} className="fill-foreground" />
            <circle cx={cx} cy={wheelY} r={wheelR * 0.52} className="fill-background" />
            <g className={cn(animate && "car-wheel")} style={{ transformOrigin: `${cx}px ${wheelY}px` }}>
              {[0, 60, 120].map((angle) => (
                <rect
                  key={angle}
                  x={cx - 0.9}
                  y={wheelY - wheelR * 0.46}
                  width={1.8}
                  height={wheelR * 0.92}
                  rx={0.9}
                  className="fill-foreground/45"
                  transform={`rotate(${angle} ${cx} ${wheelY})`}
                />
              ))}
            </g>
          </g>
        ))}

        {/* A copper glint that travels along the flank as it turns. */}
        <path
          d="M20 44 L184 40"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className={cn("text-accent-text", animate && "car-glint")}
        />
      </svg>
    </div>
  );
}
