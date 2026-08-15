"use client";

import { useEffect, useState } from "react";

/**
 * Holds a value still until it has stopped changing.
 *
 * Search boxes here run against the API, and the users are on metered mobile
 * data over 3G. Firing a request per keystroke would spend their money to
 * answer half typed questions, and the answers would arrive out of order.
 */
export function useDebounced<T>(value: T, delayMs = 300): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
}
