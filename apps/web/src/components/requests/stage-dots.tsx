import { type RequestStatus, TIMELINE_STAGES } from "@chrysmec/shared";
import { cn } from "@/lib/utils";

/**
 * The status timeline compressed to five segments, for lists where the full
 * stepper would not fit. Someone scanning their bookings can see how far each
 * one has got without opening any of them.
 *
 * Never colour alone: the reading is in the label beside it and in the title,
 * and the whole thing is hidden from screen readers because the status badge
 * next to it already says the same in words.
 */
export function StageDots({
  status,
  className,
}: {
  status: RequestStatus;
  className?: string;
}) {
  const isCancelled = status === "CANCELLED";
  const isFinished = status === "COMPLETED";
  const reached = TIMELINE_STAGES.indexOf(status);

  return (
    <span
      aria-hidden
      title={isCancelled ? "Cancelled" : undefined}
      className={cn("flex gap-1", className)}
    >
      {TIMELINE_STAGES.map((stage, index) => {
        // A finished booking is all done and nothing is current. Marking its
        // last stage as current painted the accent on it, which read as
        // something still wanting attention.
        const isDone = !isCancelled && reached >= 0 && (isFinished || index < reached);
        const isCurrent = !isCancelled && !isFinished && index === reached;

        return (
          <span
            key={stage}
            className={cn(
              "h-1 w-5 rounded-full transition-colors duration-200 motion-reduce:transition-none",
              isCancelled && "bg-destructive/30",
              isDone && "bg-primary",
              isCurrent && "bg-accent",
              !isCancelled && !isDone && !isCurrent && "bg-border",
            )}
          />
        );
      })}
    </span>
  );
}
