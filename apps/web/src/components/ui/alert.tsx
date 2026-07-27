import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertTone = "error" | "success" | "info";

const TONE_STYLES: Record<AlertTone, { container: string; icon: typeof CircleAlert }> = {
  error: {
    container: "border-destructive/40 bg-destructive/10 text-foreground",
    icon: CircleAlert,
  },
  success: {
    container: "border-success/40 bg-success/10 text-foreground",
    icon: CircleCheck,
  },
  info: {
    container: "border-border bg-muted text-foreground",
    icon: Info,
  },
};

type AlertProps = {
  tone?: AlertTone;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * Status is never carried by colour alone: every tone has an icon and words.
 * Errors are announced through aria-live so a screen reader hears them.
 */
export function Alert({ tone = "info", title, children, className }: AlertProps) {
  const { container, icon: Icon } = TONE_STYLES[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={cn("flex gap-3 rounded-lg border p-3 text-sm", container, className)}
    >
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="space-y-1">
        {title ? <p className="font-medium">{title}</p> : null}
        <div className="text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}
