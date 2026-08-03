"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Crosshair, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motionTokens } from "@/lib/motion";

type Coordinates = { latitude: number; longitude: number };

/**
 * Pins where the vehicle actually is, using the device's own position.
 *
 * No map and no tiles on purpose. A technician sent to "roadside, Kumasi to
 * Accra road" has nothing to work with, and a coordinate fixes that on its own:
 * it opens in whatever map app is already on their phone. A drawn map would add
 * a library and a tile provider to a page loaded over 3G to show the same two
 * numbers.
 *
 * Always optional. Somebody bringing the car to the workshop has no reason to
 * share where they are standing, and somebody who declines the browser prompt
 * must still be able to finish booking.
 */
export function PinLocation({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (coordinates: Coordinates | null) => void;
}) {
  const [status, setStatus] = useState<"idle" | "locating" | "denied" | "unavailable">("idle");
  const prefersReducedMotion = useReducedMotion();

  const pinned = latitude !== null && longitude !== null;

  function locate(): void {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }

    setStatus("locating");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setStatus("idle");
      },
      (error) => {
        // Code 1 is the customer saying no, which is not an error to apologise
        // for. Anything else means the device could not work it out.
        setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }

  return (
    <div>
      <AnimatePresence mode="wait" initial={false}>
        {pinned ? (
          <motion.div
            key="pinned"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.fast, ease: motionTokens.easeOut }}
            className="flex items-center gap-3 rounded-lg border border-success/40 bg-success/5 px-4 py-3"
          >
            <MapPin aria-hidden size={18} className="shrink-0 text-success" />
            <div className="min-w-0 flex-1">
              <p className="text-base text-foreground">Location pinned</p>
              <p className="font-mono text-xs text-muted-foreground">
                {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setStatus("idle");
              }}
              aria-label="Remove the pinned location"
              className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X aria-hidden size={18} />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="unpinned"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.fast, ease: motionTokens.easeOut }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={locate}
              isPending={status === "locating"}
              pendingLabel="Finding you"
            >
              <Crosshair aria-hidden size={16} />
              Pin my current location
            </Button>

            <p className="mt-2 text-sm text-muted-foreground">
              {status === "denied"
                ? "Your browser did not share your location. Type the address above instead, or turn location on for this site and try again."
                : status === "unavailable"
                  ? "We could not work out where you are. Type the address above instead."
                  : "Optional. Helps us find you if the vehicle cannot be driven in."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
