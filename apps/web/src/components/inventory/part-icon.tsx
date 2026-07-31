import { cn } from "@/lib/utils";

/**
 * A drawing of the part, worked out from its code and name.
 *
 * Photographs were the obvious idea and are not available: there is no licensed
 * source for pictures of these parts, stock imagery of the wrong alternator is
 * worse than no picture, and hosting uploads needs storage this project is not
 * allowed to pay for. These are a few hundred bytes each, they scale, they take
 * the theme, and they are honest about being diagrams.
 *
 * If real photographs of the actual shelf turn up later, this is the one place
 * that has to change.
 */

type PartKind =
  | "oil"
  | "filter"
  | "brake-pad"
  | "brake-fluid"
  | "shock"
  | "hose"
  | "coolant"
  | "battery"
  | "alternator"
  | "starter"
  | "coil"
  | "wiring"
  | "fuse"
  | "generic";

/**
 * Matched on the part name first, because that is what a person typed, and the
 * code second, because ours happen to carry a category in the middle segment.
 */
const RULES: ReadonlyArray<{ pattern: RegExp; kind: PartKind }> = [
  { pattern: /brake fluid|BRK-FLD/i, kind: "brake-fluid" },
  { pattern: /brake pad|pad set|BRK-PAD/i, kind: "brake-pad" },
  { pattern: /shock|strut|SUS-SHK/i, kind: "shock" },
  { pattern: /hose|COL-HOS/i, kind: "hose" },
  { pattern: /coolant|COL-CONC/i, kind: "coolant" },
  { pattern: /engine oil|OIL-/i, kind: "oil" },
  { pattern: /filter|FLT-/i, kind: "filter" },
  { pattern: /battery|BAT-/i, kind: "battery" },
  { pattern: /alternator|ALT-/i, kind: "alternator" },
  { pattern: /starter|solenoid|STR-/i, kind: "starter" },
  { pattern: /coil|IGN-/i, kind: "coil" },
  { pattern: /wiring|loom|WIR-/i, kind: "wiring" },
  { pattern: /fuse|FUS-/i, kind: "fuse" },
];

export function partKindFor(name: string, sku: string): PartKind {
  const haystack = `${name} ${sku}`;

  for (const rule of RULES) {
    if (rule.pattern.test(haystack)) {
      return rule.kind;
    }
  }

  return "generic";
}

/** Every drawing sits on the same 32 by 32 stage and uses currentColor. */
const SHAPES: Readonly<Record<PartKind, React.ReactNode>> = {
  oil: (
    <>
      <path d="M9 12h11l3 3v11a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2z" />
      <path d="M13 12V9a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
      <path d="M23 17h4l2 2" />
    </>
  ),
  filter: (
    <>
      <ellipse cx="16" cy="9" rx="7" ry="3" />
      <path d="M9 9v14c0 1.7 3.1 3 7 3s7-1.3 7-3V9" />
      <path d="M12 14v8M16 13v10M20 14v8" />
    </>
  ),
  "brake-pad": (
    <>
      <path d="M7 11h13a5 5 0 0 1 0 10H7z" />
      <path d="M7 11v10" />
      <path d="M23 13h2v6h-2" />
    </>
  ),
  "brake-fluid": (
    <>
      <path d="M11 13h10v12a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2z" />
      <path d="M14 13V8h4v5" />
      <path d="M11 19h10" />
    </>
  ),
  shock: (
    <>
      <circle cx="16" cy="6" r="2" />
      <path d="M16 8v4" />
      <path d="M12 12h8l-1 5 1 3-2 2 1 3h-8l1-3-2-2 1-3z" />
      <path d="M16 25v2" />
      <circle cx="16" cy="28" r="2" />
    </>
  ),
  hose: (
    <>
      <path d="M6 22c0-8 6-12 12-12 4 0 6 2 8 4" />
      <path d="M4 20h4v4H4z" />
      <path d="M24 12h4v4h-4z" />
    </>
  ),
  coolant: (
    <>
      <path d="M12 12h8v13a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3z" />
      <path d="M14 12V9h4v3" />
      <path d="M16 17v6M13.5 20h5" />
    </>
  ),
  battery: (
    <>
      <rect x="5" y="11" width="22" height="13" rx="2" />
      <path d="M10 11V8h4v3M18 11V8h4v3" />
      <path d="M11 17.5h4M19 17.5h4M21 15.5v4" />
    </>
  ),
  alternator: (
    <>
      <circle cx="15" cy="16" r="8" />
      <circle cx="15" cy="16" r="3" />
      <path d="M23 13h4v6h-4" />
      <path d="M15 8v2M15 22v2M9.3 16H7" />
    </>
  ),
  starter: (
    <>
      <rect x="6" y="11" width="14" height="11" rx="3" />
      <path d="M20 14h5a2 2 0 0 1 0 4h-5" />
      <path d="M10 11V8h5v3" />
      <path d="M9 22v3M17 22v3" />
    </>
  ),
  coil: (
    <>
      <rect x="9" y="6" width="14" height="13" rx="2" />
      <path d="M12 19v4M16 19v6M20 19v4" />
      <path d="M12 10h8M12 14h8" />
    </>
  ),
  wiring: (
    <>
      <path d="M5 10c6 0 6 12 12 12s6-12 10-12" />
      <path d="M5 22c4 0 5-4 8-4" />
      <circle cx="27" cy="10" r="2" />
      <circle cx="5" cy="10" r="2" />
    </>
  ),
  fuse: (
    <>
      <rect x="7" y="10" width="18" height="12" rx="2" />
      <path d="M11 22v4M21 22v4" />
      <path d="M11 16h4l2-3 2 6 2-3h2" />
    </>
  ),
  generic: (
    <>
      <path d="M20 8a5 5 0 0 0-6.8 6.5L7 20.7a2.5 2.5 0 0 0 3.5 3.5l6.2-6.2A5 5 0 0 0 24 12l-3 3-3-3z" />
    </>
  ),
};

export function PartIcon({
  name,
  sku,
  className,
}: {
  name: string;
  sku: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-8", className)}
    >
      {SHAPES[partKindFor(name, sku)]}
    </svg>
  );
}
