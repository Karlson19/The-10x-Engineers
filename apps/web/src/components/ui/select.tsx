import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

/**
 * The native control on purpose. On a mid-range Android phone the operating
 * system picker is faster, more accessible and far lighter than anything we
 * could build, so we only restyle the closed state.
 */
export function Select({ className, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          "min-h-12 w-full appearance-none rounded-lg border border-input bg-card px-3.5 pr-10 text-base text-foreground",
          "transition-colors duration-150 motion-reduce:transition-none",
          "hover:border-foreground/30",
          "disabled:cursor-not-allowed disabled:opacity-60",
          "aria-[invalid=true]:border-destructive",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        size={18}
        className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
