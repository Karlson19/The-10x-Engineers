"use client";

import { useEffect, useState } from "react";

type LogoMap = Readonly<Record<string, string>>;

/**
 * The logo paths are about 60kB of geometry. They are loaded on demand rather
 * than bundled into any route, so the vehicle form paints immediately with
 * monograms and the real marks swap in a moment later. On a 3G connection that
 * is the difference between a form you can start filling and one you wait for.
 *
 * Module level cache, so the download happens once per visit no matter how
 * many rows ask for it.
 */
let cache: LogoMap | null = null;
let inFlight: Promise<LogoMap> | null = null;

function load(): Promise<LogoMap> {
  inFlight ??= import("@/lib/vehicle-brand-logos").then((module) => {
    cache = module.VEHICLE_BRAND_LOGOS;
    return cache;
  });

  return inFlight;
}

export function useBrandLogos(): LogoMap | null {
  const [logos, setLogos] = useState<LogoMap | null>(cache);

  useEffect(() => {
    if (cache) {
      setLogos(cache);
      return;
    }

    let active = true;
    void load().then((loaded) => {
      if (active) {
        setLogos(loaded);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return logos;
}
