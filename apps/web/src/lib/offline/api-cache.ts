/**
 * The service worker keeps API reads in a cache so a returning user sees their
 * vehicles and bookings instantly over 3G. That cache belongs to whoever was
 * signed in when it was filled.
 *
 * It has to be emptied whenever the session changes, in both directions. On
 * sign out, because the next person to pick the phone up must not be served the
 * last person's bookings. On sign in, because a stale entry would otherwise be
 * handed straight back before the network answers, which showed people data
 * from an account they had just left.
 */
const API_CACHE_NAME = "chrysmec-api";

export async function clearApiCache(): Promise<void> {
  if (typeof caches === "undefined") {
    return;
  }

  try {
    await caches.delete(API_CACHE_NAME);
  } catch {
    // A browser that refuses the cache API is no reason to block signing in or
    // out. The worst case is a stale read that the network corrects.
  }
}
