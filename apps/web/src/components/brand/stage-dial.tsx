import { TIMELINE_STAGES } from "@chrysmec/shared";
import { arcPath, polar, tickPath } from "@/components/brand/geometry";
import { cn } from "@/lib/utils";

const SIZE = 400;
const CENTRE = SIZE / 2;
const FACE_RADIUS = 188;
const TRACK_RADIUS = 138;
const CORE_RADIUS = 88;

/** The five timeline stages laid out over three quarters of the face. */
const FIRST_STAGE_ANGLE = -108;
const STAGE_SWEEP = 54;
const LAST_STAGE_ANGLE = FIRST_STAGE_ANGLE + STAGE_SWEEP * (TIMELINE_STAGES.length - 1);

/**
 * The hero artwork is the status timeline drawn as an instrument face. It is
 * the one screen a customer remembers, so the shopfront leads with it rather
 * than with a stock photograph. Pure geometry, no image request, which also
 * means nothing to download on a 3G connection.
 *
 * It runs continuously: the needle steps through the five stages of a job,
 * pausing on each, and the copper track fills to meet it. The pauses are the
 * point. A gauge that holds at a reading looks like it is measuring something.
 *
 * All of it is CSS, so the landing page carries no animation library, and all
 * of it stops under prefers-reduced-motion.
 */
export function StageDial({ className }: { className?: string }) {
  const stageAngles = TIMELINE_STAGES.map(
    (_stage, index) => FIRST_STAGE_ANGLE + index * STAGE_SWEEP,
  );

  const minorTicks: string[] = [];
  const majorTicks: string[] = [];

  for (let degrees = 0; degrees < 360; degrees += 6) {
    if (degrees % 30 === 0) {
      majorTicks.push(tickPath(CENTRE, CENTRE, FACE_RADIUS, 14, degrees));
    } else {
      minorTicks.push(tickPath(CENTRE, CENTRE, FACE_RADIUS, 7, degrees));
    }
  }

  // The needle is drawn pointing at the middle stage and rotated from there,
  // so the keyframes are symmetrical around zero.
  const [needleX, needleY] = polar(CENTRE, CENTRE, CORE_RADIUS - 14, 0);
  const [tipX, tipY] = polar(CENTRE, CENTRE, TRACK_RADIUS - 22, 0);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={cn("size-full", className)}
      fill="none"
      aria-hidden
    >
      <g className="dial-face">
        <circle cx={CENTRE} cy={CENTRE} r={FACE_RADIUS} className="stroke-border" strokeWidth={1} />
        <circle cx={CENTRE} cy={CENTRE} r={CORE_RADIUS} className="stroke-border" strokeWidth={1} />

        <g className="dial-bezel">
          {minorTicks.map((d) => (
            <path key={d} d={d} className="stroke-border" strokeWidth={1} />
          ))}
          {majorTicks.map((d) => (
            <path key={d} d={d} className="stroke-muted-foreground/40" strokeWidth={1} />
          ))}
        </g>
      </g>

      {/* The whole run of a job, unlit. */}
      <path
        d={arcPath(CENTRE, CENTRE, TRACK_RADIUS, FIRST_STAGE_ANGLE, LAST_STAGE_ANGLE)}
        className="stroke-border"
        strokeWidth={7}
        strokeLinecap="round"
      />

      {/* The part of it that is done, filling to meet the needle. */}
      <path
        d={arcPath(CENTRE, CENTRE, TRACK_RADIUS, FIRST_STAGE_ANGLE, LAST_STAGE_ANGLE)}
        // pathLength normalises the dash units to 0 to 1, so the fill does not
        // have to know how long the arc actually is.
        pathLength={1}
        className="dial-sweep stroke-primary"
        strokeWidth={7}
        strokeLinecap="round"
      />

      {stageAngles.map((degrees, index) => {
        const [x, y] = polar(CENTRE, CENTRE, TRACK_RADIUS, degrees);

        return (
          <circle
            key={TIMELINE_STAGES[index]}
            cx={x}
            cy={y}
            r={8}
            className="dial-node fill-background stroke-border"
            style={{ animationDelay: `${0.2 + index * 0.12}s` }}
            strokeWidth={2}
          />
        );
      })}

      {/* The needle, with the copper head that rides the track. */}
      <g className="dial-needle">
        <path
          d={`M ${CENTRE} ${CENTRE} L ${needleX} ${needleY}`}
          className="stroke-accent"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={tipX} cy={tipY} r={19} className="dial-pulse fill-accent/25" />
        <circle cx={tipX} cy={tipY} r={11} className="fill-accent" />
        <circle cx={CENTRE} cy={CENTRE} r={6} className="fill-accent" />
      </g>
    </svg>
  );
}
