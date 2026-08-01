"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  type CreateServiceRequest,
  type SymptomAnswers,
  assessUrgency,
  canAssessUrgency,
  getSymptomCategory,
  validateSymptomAnswers,
} from "@chrysmec/shared";
import { StepReview } from "@/components/booking/steps/step-review";
import { StepSchedule } from "@/components/booking/steps/step-schedule";
import { StepServices } from "@/components/booking/steps/step-services";
import { StepSymptoms } from "@/components/booking/steps/step-symptoms";
import { StepVehicle } from "@/components/booking/steps/step-vehicle";
import { useBookingDraft } from "@/components/booking/use-booking-draft";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCatalogue, useCreateServiceRequest } from "@/hooks/use-service-requests";
import { useOffline } from "@/components/providers/offline-provider";
import { useToast } from "@/components/ui/toast";
import { isOutboxAvailable } from "@/lib/offline/db";
import { enqueueBooking } from "@/lib/offline/outbox";
import { useVehicles } from "@/hooks/use-vehicles";
import { ApiError } from "@/lib/api/client";
import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

const STEPS = [
  { title: "Vehicle", heading: "Which vehicle?" },
  { title: "Problem", heading: "What is going on?" },
  { title: "Services", heading: "Anything you already know you need?" },
  { title: "When", heading: "When and where?" },
  { title: "Review", heading: "Check and send" },
] as const;

export function BookingWizard() {
  const router = useRouter();
  const { draft, update, reset, isRestored } = useBookingDraft();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [direction, setDirection] = useState(1);
  const stepRef = useRef<HTMLDivElement>(null);

  const vehicles = useVehicles();
  const catalogue = useCatalogue(draft.section);
  const createMutation = useCreateServiceRequest();
  const { isOnline, refreshPending } = useOffline();
  const { showToast } = useToast();

  const selectedVehicle = useMemo(
    () => vehicles.data?.data.find((vehicle) => vehicle.id === draft.vehicleId),
    [vehicles.data, draft.vehicleId],
  );

  const selectedServices = useMemo(
    () => (catalogue.data?.data ?? []).filter((item) => draft.serviceCatalogItemIds.includes(item.id)),
    [catalogue.data, draft.serviceCatalogItemIds],
  );

  function validate(step: number): Record<string, string> {
    if (step === 0) {
      return draft.vehicleId ? {} : { vehicleId: "Choose a vehicle to continue." };
    }

    if (step === 1) {
      if (!draft.section) {
        return { section: "Choose mechanical or electrical." };
      }
      if (!draft.symptomCategory) {
        return { symptomCategory: "Choose what the problem relates to." };
      }
      const category = getSymptomCategory(draft.symptomCategory);
      return category ? validateSymptomAnswers(category, draft.symptomDetails) : {};
    }

    if (step === 3) {
      const found: Record<string, string> = {};
      if (!draft.preferredDate) {
        found.preferredDate = "Choose a date.";
      }
      if (!draft.preferredTime) {
        found.preferredTime = "Choose a time.";
      }
      if (draft.locationText.trim().length < 3) {
        found.locationText = "Tell us where the vehicle will be.";
      }
      return found;
    }

    return {};
  }

  /** Only the offending field shakes, and the page scrolls it into view. */
  function flagFirstInvalidField(): void {
    window.requestAnimationFrame(() => {
      const target = stepRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
      if (!target) {
        return;
      }
      target.classList.remove("field-shake");
      // Reading offsetWidth restarts the animation if it is already applied.
      void target.offsetWidth;
      target.classList.add("field-shake");
      target.scrollIntoView({ block: "center", behavior: "smooth" });
      window.setTimeout(() => target.classList.remove("field-shake"), 400);
    });
  }

  function goTo(nextStep: number): void {
    setDirection(nextStep > draft.step ? 1 : -1);
    setErrors({});
    setFormError(null);
    update({ step: nextStep });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleNext(): void {
    const found = validate(draft.step);

    if (Object.keys(found).length > 0) {
      setErrors(found);
      flagFirstInvalidField();
      return;
    }

    goTo(draft.step + 1);
  }

  async function handleSubmit(): Promise<void> {
    setFormError(null);

    // Re-check every step, because someone can reach review with a stale draft.
    for (let step = 0; step <= 3; step += 1) {
      const found = validate(step);
      if (Object.keys(found).length > 0) {
        setErrors(found);
        goTo(step);
        flagFirstInvalidField();
        return;
      }
    }

    if (!draft.vehicleId || !draft.section || !draft.symptomCategory) {
      return;
    }

    const payload: CreateServiceRequest = {
      clientRequestId: draft.clientRequestId,
      vehicleId: draft.vehicleId,
      section: draft.section,
      symptomCategory: draft.symptomCategory,
      symptomDetails: draft.symptomDetails,
      serviceCatalogItemIds: draft.serviceCatalogItemIds,
      preferredDateTime: new Date(`${draft.preferredDate}T${draft.preferredTime}`).toISOString(),
      locationText: draft.locationText.trim(),
    };

    /**
     * Offline, the booking goes into the outbox and we return straight away.
     * The customer is standing next to a car with no signal: making them wait
     * for a timeout and then retype everything would be the whole problem this
     * app exists to solve.
     */
    if (!isOnline) {
      await queueBooking(payload);
      return;
    }

    try {
      const created = await createMutation.mutateAsync(payload);
      reset();
      router.replace(`/dashboard/requests/${created.id}?booked=1`);
    } catch (error) {
      // The connection went between opening the form and pressing send. Queue
      // it rather than losing it.
      if (error instanceof ApiError && error.code === "NETWORK_ERROR") {
        await queueBooking(payload);
        return;
      }

      setFormError(
        error instanceof ApiError
          ? error.message
          : "Could not send your booking. Check your connection and try again.",
      );
    }
  }

  async function queueBooking(payload: CreateServiceRequest): Promise<void> {
    if (!isOutboxAvailable()) {
      setFormError(
        "Your browser cannot save the booking offline. Reconnect and try again.",
      );
      return;
    }

    try {
      await enqueueBooking(payload);
      await refreshPending();
      reset();
      showToast({
        tone: "info",
        title: "Saved on your phone",
        body: "We will send it to the workshop as soon as you have signal.",
      });
      router.replace("/dashboard/requests");
    } catch {
      setFormError("Could not save your booking on this device. Try again.");
    }
  }

  if (!isRestored) {
    return (
      <div className="space-y-4" aria-busy="true">
        <span className="sr-only">Loading the booking form</span>
        <Skeleton className="h-1.5" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-[4.5rem]" />
        <Skeleton className="h-[4.5rem]" />
      </div>
    );
  }

  const step = Math.min(Math.max(draft.step, 0), STEPS.length - 1);
  const current = STEPS[step] ?? STEPS[0];
  const progress = (step + 1) / STEPS.length;
  const isLast = step === STEPS.length - 1;

  /*
    When the intake says stop driving, ringing the workshop is the most
    important thing on the screen, so the booking button steps down to pine and
    leaves the red to the phone number. Two red buttons competing would make the
    warning look like decoration.
  */
  const isUrgent =
    draft.symptomCategory !== null &&
    canAssessUrgency(draft.symptomDetails) &&
    assessUrgency(draft.symptomCategory, draft.symptomDetails).level === "urgent";
  const advanceVariant = isUrgent ? "primary" : "accent";

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-baseline justify-between gap-4">
          <p className="eyebrow">
            Step {step + 1} of {STEPS.length}
          </p>
          <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
            {current.title}
          </p>
        </div>
        <div
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-label="Booking progress"
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-border"
        >
          <motion.div
            className="h-full origin-left rounded-full bg-accent"
            initial={false}
            animate={{ scaleX: progress }}
            transition={motionTokens.spring}
            style={{ width: "100%" }}
          />
        </div>

        {/*
          Steps already passed are reachable in one tap. Changing an answer four
          steps back used to mean pressing Back four times, which is where
          people give up and ring instead.

          Hidden on a phone: "Step 1 of 5" and the current step's name are
          already above, and the five words wrapped onto two lines saying the
          same thing a third time.
        */}
        <ol className="mt-3 hidden flex-wrap gap-x-1 gap-y-1 sm:flex">
          {STEPS.map((entry, index) => {
            const isDone = index < step;
            const isCurrent = index === step;

            return (
              <li key={entry.title}>
                <button
                  type="button"
                  disabled={!isDone}
                  aria-current={isCurrent ? "step" : undefined}
                  onClick={() => goTo(index)}
                  className={cn(
                    "min-h-9 rounded-md px-2 font-mono text-xs tracking-[0.1em] uppercase transition-colors",
                    isCurrent && "text-foreground",
                    isDone && "text-muted-foreground underline decoration-accent decoration-2 underline-offset-4 hover:text-foreground",
                    !isDone && !isCurrent && "text-muted-foreground/50",
                  )}
                >
                  {entry.title}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <h1 className="font-display text-3xl font-semibold text-foreground">{current.heading}</h1>

      <div className="mt-7 overflow-x-clip">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={step}
            ref={stepRef}
            custom={direction}
            initial={{ opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -24 }}
            transition={{ duration: motionTokens.base, ease: motionTokens.easeOut }}
          >
            {step === 0 ? (
              <StepVehicle
                vehicleId={draft.vehicleId}
                error={errors.vehicleId}
                onSelect={(id) => {
                  setErrors({});
                  update({ vehicleId: id });
                }}
              />
            ) : null}

            {step === 1 ? (
              <StepSymptoms
                section={draft.section}
                symptomCategory={draft.symptomCategory}
                symptomDetails={draft.symptomDetails}
                errors={errors}
                onChangeSection={(section) => {
                  setErrors({});
                  // The category and its answers belong to the old section.
                  update({
                    section,
                    symptomCategory: null,
                    symptomDetails: {},
                    serviceCatalogItemIds: [],
                  });
                }}
                onChangeCategory={(symptomCategory) => {
                  setErrors({});
                  update({ symptomCategory, symptomDetails: {} });
                }}
                onChangeAnswers={(symptomDetails: SymptomAnswers) => update({ symptomDetails })}
              />
            ) : null}

            {step === 2 ? (
              <StepServices
                section={draft.section}
                symptomCategory={draft.symptomCategory}
                symptomDetails={draft.symptomDetails}
                selectedIds={draft.serviceCatalogItemIds}
                onChange={(serviceCatalogItemIds) => update({ serviceCatalogItemIds })}
              />
            ) : null}

            {step === 3 ? (
              <StepSchedule
                preferredDate={draft.preferredDate}
                preferredTime={draft.preferredTime}
                locationText={draft.locationText}
                errors={errors}
                onChange={(patch) => {
                  setErrors({});
                  update(patch);
                }}
              />
            ) : null}

            {step === 4 ? (
              <StepReview
                vehicle={selectedVehicle}
                section={draft.section}
                symptomCategory={draft.symptomCategory}
                symptomDetails={draft.symptomDetails}
                services={selectedServices}
                preferredDate={draft.preferredDate}
                preferredTime={draft.preferredTime}
                locationText={draft.locationText}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {formError ? (
        <Alert tone="error" title="Could not send your booking" className="mt-6">
          {formError}
        </Alert>
      ) : null}

      <div className="mt-9 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="ghost"
          onClick={() => (step === 0 ? router.push("/dashboard") : goTo(step - 1))}
          className="px-3"
        >
          <ArrowLeft aria-hidden size={18} />
          {step === 0 ? "Cancel" : "Back"}
        </Button>

        {isLast ? (
          <Button
            variant={advanceVariant}
            onClick={() => void handleSubmit()}
            isPending={createMutation.isPending}
            pendingLabel="Sending"
          >
            Send booking
          </Button>
        ) : (
          <Button variant={advanceVariant} onClick={handleNext}>
            Continue
            <ArrowRight aria-hidden size={18} />
          </Button>
        )}
      </div>
    </div>
  );
}
