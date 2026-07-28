import { makeInitials, makeTint } from "@/lib/vehicle-catalogue";
import { cn } from "@/lib/utils";

/**
 * A brand tile drawn from the manufacturer's name. Real manufacturer logos are
 * trademarks and we have no licence to redistribute them, so the mark is the
 * initials set in the mono face on a tint picked deterministically from a small
 * on-brand palette. It stays recognisable in a list without turning the picker
 * into a rainbow, and it costs no image request on a 3G connection.
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
  const trimmed = make.trim();

  if (trimmed.length === 0) {
    return null;
  }

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
      {makeInitials(trimmed)}
    </span>
  );
}
