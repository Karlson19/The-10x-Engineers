import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/**
 * Large single column inputs, because people fill these in standing next to a
 * car. 16px text also stops iOS zooming the page on focus.
 */
export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "min-h-12 w-full rounded-lg border border-input bg-card px-3.5 text-base text-foreground",
        "placeholder:text-muted-foreground/70",
        "transition-colors duration-150 motion-reduce:transition-none",
        "hover:border-foreground/30",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:hover:border-destructive",
        className,
      )}
      {...props}
    />
  );
}
