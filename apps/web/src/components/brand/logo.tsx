import { LogoMark } from "@/components/brand/logo-mark";
import { cn } from "@/lib/utils";

/**
 * The lockup: mark, name in the display serif, and the descriptor in mono
 * small caps underneath. The descriptor is what stops it reading as a bare
 * word and is dropped only where vertical space genuinely does not allow it.
 */
export function Logo({
  className,
  markClassName,
  accentClassName,
  showDescriptor = true,
}: {
  className?: string;
  markClassName?: string;
  accentClassName?: string;
  showDescriptor?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className={cn("size-9 shrink-0", markClassName)} accentClassName={accentClassName} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl font-semibold tracking-[-0.02em] whitespace-nowrap">
          Chrysmec
        </span>
        {showDescriptor ? (
          <span className="mt-1 font-mono text-[0.625rem] tracking-[0.18em] whitespace-nowrap uppercase opacity-70">
            Auto Center
          </span>
        ) : null}
      </span>
    </span>
  );
}
