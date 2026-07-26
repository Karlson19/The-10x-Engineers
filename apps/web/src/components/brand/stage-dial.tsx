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

/** How far the job on the dial has got. Three of five stages done. */
const COMPLETED_STAGES = 3;

/**
 * The hero artwork is the status timeline drawn as an instrument face. It is
 * the one screen a customer remembers, so the shopfront leads with it rather
 * than with a stock photograph. Pure geometry, no image request, which also
 * means nothing to download on a 3G connection.
 */
export function StageDial({ className }: { className?: string }) {
  const stageAngles = TIMELINE_STAGES.map(
    (_stage, index) => FIRST_STAGE_ANGLE + index * STAGE_SWEEP,
  );
  const lastCompletedAngle = stageAngles[COMPLETED_STAGES - 1] ?? FIRST_STAGE_ANGLE;

  const minorTicks: string[] = [];
  const majorTicks: string[] = [];

  for (let degrees = 0; degrees < 360; degrees += 6) {
    if (degrees % 30 === 0) {
      majorTicks.push(tickPath(CENTRE, CENTRE, FACE_RADIUS, 14, degrees));
    } else {
      minorTicks.push(tickPath(CENTRE, CENTRE, FACE_RADIUS, 7, degrees));
    }
  }

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={cn("size-full", className)}
      fill="none"
      aria-hidden
    >
      <circle cx={CENTRE} cy={CENTRE} r={FACE_RADIUS} className="stroke-border" strokeWidth={1} />
      <circle cx={CENTRE} cy={CENTRE} r={CORE_RADIUS} className="stroke-border" strokeWidth={1} />

      {minorTicks.map((d) => (
        <path key={d} d={d} className="stroke-border" strokeWidth={1} />
      ))}
      {majorTicks.map((d) => (
        <path key={d} d={d} className="stroke-muted-foreground/40" strokeWidth={1} />
      ))}

      {/* The full run of the job, then the part of it that is done. */}
      <path
        d={arcPath(
          CENTRE,
          CENTRE,
          TRACK_RADIUS,
          FIRST_STAGE_ANGLE,
          FIRST_STAGE_ANGLE + STAGE_SWEEP * (TIMELINE_STAGES.length - 1),
        )}
        className="stroke-border"
        strokeWidth={6}
        strokeLinecap="round"
      />
      <path
        d={arcPath(CENTRE, CENTRE, TRACK_RADIUS, FIRST_STAGE_ANGLE, lastCompletedAngle)}
        className="stroke-primary"
        strokeWidth={6}
        strokeLinecap="round"
      />

      {stageAngles.map((degrees, index) => {
        const [x, y] = polar(CENTRE, CENTRE, TRACK_RADIUS, degrees);
        const isCurrent = index === COMPLETED_STAGES - 1;
        const isDone = index < COMPLETED_STAGES;

        return (
          <g key={TIMELINE_STAGES[index]}>
            {isCurrent ? (
              <circle cx={x} cy={y} r={19} className="fill-accent/12" />
            ) : null}
            <circle
              cx={x}
              cy={y}
              r={isCurrent ? 11 : 8}
              className={
                isCurrent
                  ? "fill-accent"
                  : isDone
                    ? "fill-primary"
                    : "fill-background stroke-border"
              }
              strokeWidth={2}
            />
          </g>
        );
      })}

      {/* The needle, pointing at the stage the job has reached. */}
      <path
        d={`M ${CENTRE} ${CENTRE} L ${polar(CENTRE, CENTRE, CORE_RADIUS - 14, lastCompletedAngle)[0]} ${polar(CENTRE, CENTRE, CORE_RADIUS - 14, lastCompletedAngle)[1]}`}
        className="stroke-accent"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <circle cx={CENTRE} cy={CENTRE} r={5} className="fill-accent" />
    </svg>
  );
}
