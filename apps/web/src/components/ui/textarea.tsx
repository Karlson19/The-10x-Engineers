import { cn } from "@/lib/utils";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, rows = 4, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={cn(
        "w-full rounded-lg border border-input bg-card px-3.5 py-3 text-base text-foreground",
        "placeholder:text-muted-foreground/70",
        "transition-colors duration-150 motion-reduce:transition-none",
        "hover:border-foreground/30",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "aria-[invalid=true]:border-destructive",
        className,
      )}
      {...props}
    />
  );
}
