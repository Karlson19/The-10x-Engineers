import { AlertTriangle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Every list has three designed states. An empty state is a plain sentence and
 * an action, never a joke. An error state says what happened and offers a way
 * out. Both live here so no screen has to invent its own.
 *
 * Which of the three ways to show a failure applies, so this does not drift:
 *
 *   Reading failed        ErrorState, in place of the content, with a retry.
 *                         The user is looking at nothing, so the message goes
 *                         where the content should have been.
 *
 *   Writing from a form   Alert, above the fields, plus the per field errors
 *                         from the server. The user is looking at the form and
 *                         needs to know which part to change.
 *
 *   Writing anywhere else Toast. A status move, a toggle in a list, a delete.
 *                         There is no form to attach a message to, and the row
 *                         it came from may no longer be on screen.
 *
 * Success is silent when the change is visible on screen, and a toast when it
 * is not, which is why saving a booking toasts and adding a work log line does
 * not.
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
