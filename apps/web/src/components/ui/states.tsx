import { AlertTriangle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Every list has three designed states. An empty state is a plain sentence and
 * an action, never a joke. An error state says what happened and offers a way
 * out. Both live here so no screen has to invent its own.
 */

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg border border-dashed border-border px-6 py-14 text-center",
        className,
      )}
    >
      <Icon aria-hidden className="size-8 text-muted-foreground" strokeWidth={1.5} />
      <h3 className="mt-5 font-display text-xl font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-base text-muted-foreground">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Could not load this",
  body,
  onRetry,
  isRetrying = false,
  className,
}: {
  title?: string;
  body: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center rounded-lg border border-destructive/40 bg-destructive/5 px-6 py-12 text-center",
        className,
      )}
    >
      <AlertTriangle aria-hidden className="size-8 text-destructive" strokeWidth={1.5} />
      <h3 className="mt-5 font-display text-xl font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-base text-muted-foreground">{body}</p>
      {onRetry ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-6"
          onClick={onRetry}
          isPending={isRetrying}
          pendingLabel="Trying again"
        >
          Try again
        </Button>
      ) : null}
    </div>
  );
}
