/**
 * Small polar helpers so the brand mark and the instrument dial are drawn from
 * real angles rather than hand-typed coordinates that nobody can adjust later.
 * Angles are degrees, measured clockwise from three o'clock, which is how SVG
 * behaves once y grows downward.
 */

export function polar(cx: number, cy: number, radius: number, degrees: number): [number, number] {
  const radians = (degrees * Math.PI) / 180;
  return [cx + radius * Math.cos(radians), cy + radius * Math.sin(radians)];
}

/** An arc path running clockwise from one angle to the next. */
export function arcPath(
  cx: number,
  cy: number,
  radius: number,
  fromDegrees: number,
  toDegrees: number,
): string {
  const [x1, y1] = polar(cx, cy, radius, fromDegrees);
  const [x2, y2] = polar(cx, cy, radius, toDegrees);
  const largeArc = Math.abs(toDegrees - fromDegrees) > 180 ? 1 : 0;

  return `M ${round(x1)} ${round(y1)} A ${radius} ${radius} 0 ${largeArc} 1 ${round(x2)} ${round(y2)}`;
}

/** A tick mark pointing inward from the given radius. */
export function tickPath(
  cx: number,
  cy: number,
  outerRadius: number,
  length: number,
  degrees: number,
): string {
  const [x1, y1] = polar(cx, cy, outerRadius, degrees);
  const [x2, y2] = polar(cx, cy, outerRadius - length, degrees);

  return `M ${round(x1)} ${round(y1)} L ${round(x2)} ${round(y2)}`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
