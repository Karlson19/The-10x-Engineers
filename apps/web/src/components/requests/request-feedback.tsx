"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Star } from "lucide-react";
import { RATING_LABELS, RATING_MAX, RATING_MIN } from "@chrysmec/shared";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useFeedback, useLeaveFeedback } from "@/hooks/use-service-requests";
import { ApiError } from "@/lib/api/client";
import { formatDate } from "@/lib/format";
import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

const RATINGS = Array.from({ length: RATING_MAX - RATING_MIN + 1 }, (_, i) => RATING_MIN + i);

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("flex gap-1", className)} aria-hidden>
      {RATINGS.map((rating) => (
        <Star
          key={rating}
          size={20}
          className={
            rating <= value ? "fill-accent text-accent" : "fill-transparent text-muted-foreground/50"
          }
        />
      ))}
    </span>
  );
}

/**
 * Closes the loop after a job. Shown only once the work is finished, because
 * rating something that has not happened would make the quality signal on the
 * management dashboard worthless.
 *
 * Radio inputs under the stars rather than buttons, so it works with a keyboard
 * and a screen reader reads it as one question with five answers.
 */
export function RequestFeedback({ requestId }: { requestId: string }) {
  const existing = useFeedback(requestId);
  const leaveFeedback = useLeaveFeedback(requestId);
  const { showToast } = useToast();
  const prefersReducedMotion = useReducedMotion();

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setError(null);

    if (rating < RATING_MIN) {
      setError("Choose a rating from one to five stars.");
      return;
    }

    try {
      await leaveFeedback.mutateAsync({
        rating,
        ...(comment.trim().length > 0 ? { comment: comment.trim() } : {}),
      });
      showToast({
        tone: "success",
        title: "Thank you",
        body: "Your rating has gone to the technician who did the work.",
      });
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not send your rating. Check your connection and try again.",
      );
    }
  }

  if (existing.isPending) {
    return (
      <section className="mt-12" aria-busy="true">
        <span className="sr-only">Loading your feedback</span>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-5 h-28" />
      </section>
    );
  }

  // Already rated. Show it back rather than inviting a second one.
  if (existing.data) {
    return (
      <section className="mt-12">
        <h2 className="border-b-2 border-foreground/85 pb-3 font-display text-xl font-semibold text-foreground">
          Your feedback
        </h2>
        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: motionTokens.base, ease: motionTokens.easeOut }}
          className="mt-5 rounded-lg border border-border bg-card p-5"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Stars value={existing.data.rating} />
            <span className="text-base font-medium text-foreground">
              {RATING_LABELS[existing.data.rating]}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {formatDate(existing.data.createdAt)}
            </span>
          </div>
          {existing.data.comment ? (
            <p className="mt-3 text-base text-muted-foreground">{existing.data.comment}</p>
          ) : null}
        </motion.div>
      </section>
    );
  }

  const shown = hovered || rating;

  return (
    <section className="mt-12">
      <h2 className="border-b-2 border-foreground/85 pb-3 font-display text-xl font-semibold text-foreground">
        How did we do?
      </h2>
      <p className="mt-4 text-base text-muted-foreground">
        Your rating goes to the technician who worked on the vehicle, and tells the workshop where
        it is falling short.
      </p>

      {error ? (
        <Alert tone="error" title="Could not send your rating" className="mt-5">
          {error}
        </Alert>
      ) : null}

      <fieldset className="mt-6" onMouseLeave={() => setHovered(0)}>
        <legend className="sr-only">Your rating out of five</legend>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex gap-1">
            {RATINGS.map((value) => (
              <label
                key={value}
                onMouseEnter={() => setHovered(value)}
                className={cn(
                  "flex size-11 cursor-pointer items-center justify-center rounded-lg",
                  "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                )}
              >
                <input
                  type="radio"
                  name="rating"
                  value={value}
                  checked={rating === value}
                  onChange={() => setRating(value)}
                  className="sr-only"
                />
                <span className="sr-only">
                  {value} {value === 1 ? "star" : "stars"}, {RATING_LABELS[value]}
                </span>
                <motion.span
                  aria-hidden
                  animate={
                    prefersReducedMotion
                      ? undefined
                      : { scale: value <= shown ? 1.1 : 1 }
                  }
                  transition={motionTokens.spring}
                >
                  <Star
                    size={28}
                    className={
                      value <= shown
                        ? "fill-accent text-accent"
                        : "fill-transparent text-muted-foreground/50"
                    }
                  />
                </motion.span>
              </label>
            ))}
          </div>

          {/* The word travels with the stars, because colour and count alone
              do not tell a screen reader anything. */}
          <AnimatePresence mode="wait">
            {shown > 0 ? (
              <motion.span
                key={shown}
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                transition={{ duration: motionTokens.fast, ease: motionTokens.easeOut }}
                className="text-base font-medium text-foreground"
              >
                {RATING_LABELS[shown]}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>
      </fieldset>

      <div className="mt-5">
        <label htmlFor="feedbackComment" className="sr-only">
          Anything you want to add
        </label>
        <Textarea
          id="feedbackComment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Anything you want to add. Optional."
        />
      </div>

      <Button
        variant="accent"
        className="mt-4"
        onClick={() => void submit()}
        isPending={leaveFeedback.isPending}
        pendingLabel="Sending"
      >
        Send feedback
      </Button>
    </section>
  );
}
