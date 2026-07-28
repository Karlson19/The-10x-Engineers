"use client";

import { useBrandLogos } from "@/hooks/use-brand-logos";
import { makeInitials, makeTint } from "@/lib/vehicle-catalogue";
import { cn } from "@/lib/utils";

/** Simple Icons draws everything on a 24 by 24 grid. */
const VIEWBOX = "0 0 24 24";

/**
 * The manufacturer's mark where we have it, the initials where we do not.
 *
 * Drawn in a single colour rather than in brand colours: it keeps the picker
 * from turning into a rainbow, it sits properly in both light and dark mode,
 * and a monochrome mark used to label a make cannot be mistaken for a
 * manufacturer endorsing this workshop.
 *
 * The monogram shows first and the logo replaces it once the path data has
 * loaded, so nothing waits on a download.
 */
export function BrandMark({
  make,
  className,
  size = "default",
}: {
  make: string;
  className?: string;
  size?: "default" | "sm";
}) {
  const logos = useBrandLogos();
  const trimmed = make.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const path = logos?.[trimmed];

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md font-mono tracking-tight",
        size === "sm" ? "size-8 text-[0.6875rem]" : "size-9 text-xs",
        makeTint(trimmed),
        className,
      )}
    >
      {path ? (
        <svg
          viewBox={VIEWBOX}
          className={size === "sm" ? "size-4" : "size-5"}
          fill="currentColor"
          role="presentation"
        >
          <path d={path} />
        </svg>
      ) : (
        makeInitials(trimmed)
      )}
    </span>
  );
}
