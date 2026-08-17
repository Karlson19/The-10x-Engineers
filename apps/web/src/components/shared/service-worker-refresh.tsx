"use client";

import { useEffect } from "react";

const RELOADED_KEY = "chrysmec-sw-reloaded";

/**
 * Picks up a new deployment without anybody having to know to refresh.
 *
 * A service worker that is already installed keeps serving the build it
 * cached. The new one activates immediately, because the worker sets
 * skipWaiting and clientsClaim, but the page open at that moment is still the
 * old one and its script chunks no longer exist on the server. That is the
 * "you have to refresh before anything works" report, and the error boundary
 * only catches it after somebody has already hit a broken screen.
 *
 * Reloading the moment control changes hands gets in front of that. It happens
 * once per session: the guard stops a worker that keeps reactivating from
 * putting the tab in a reload loop, which would be far worse than the problem.
 */
export function ServiceWorkerRefresh() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    function handleControllerChange(): void {
      if (sessionStorage.getItem(RELOADED_KEY)) {
        return;
      }

      sessionStorage.setItem(RELOADED_KEY, "1");
      window.location.reload();
    }

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    // Ask whether there is a newer build whenever the tab is brought back,
    // rather than only on a cold load. Somebody who leaves the app open all
    // day would otherwise never be offered one.
    function checkForUpdate(): void {
      if (document.visibilityState !== "visible") {
        return;
      }

      void navigator.serviceWorker.getRegistration().then((registration) => {
        void registration?.update();
      });
    }

    document.addEventListener("visibilitychange", checkForUpdate);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      document.removeEventListener("visibilitychange", checkForUpdate);
    };
  }, []);

  return null;
}
