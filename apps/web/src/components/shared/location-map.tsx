"use client";

import { useEffect, useRef } from "react";
import leaflet, { type Map as LeafletMap } from "leaflet";
import { BUSINESS } from "@chrysmec/shared";
import "leaflet/dist/leaflet.css";

/**
 * Where the vehicle is, drawn.
 *
 * Leaflet with OpenStreetMap tiles, because it is the only mapping stack that
 * needs no credit card: Google and Mapbox both want billing details even on
 * their free tiers, and this project is not allowed to take on a paid service.
 *
 * Leaflet needs a real window, and it is far too heavy to put in the bundle of
 * every page that merely might show a map. Callers therefore pull this in with
 * next/dynamic and ssr disabled, which is what keeps both the library and its
 * stylesheet in a chunk that only downloads when a location was actually
 * pinned.
 */
export function LocationMap({
  latitude,
  longitude,
  label,
}: {
  latitude: number;
  longitude: number;
  label: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    function draw(): void {
      if (!containerRef.current || mapRef.current) {
        return;
      }

      const map = leaflet.map(containerRef.current, {
        center: [latitude, longitude],
        zoom: 15,
        // A map inside a scrolling page must not swallow the scroll. Dragging
        // and the buttons still work, so it is reachable without trapping it.
        scrollWheelZoom: false,
        attributionControl: true,
      });
      mapRef.current = map;

      leaflet
        .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          // Required by the OpenStreetMap tile usage policy.
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        })
        .addTo(map);

      /*
        Leaflet's default marker points at image files by relative path, which
        does not survive a bundler. A divIcon is markup we already control, so
        it takes the app's own colours and needs no asset.
      */
      const pin = leaflet.divIcon({
        className: "",
        html: `<span style="
          display:block;width:1.5rem;height:1.5rem;border-radius:9999px;
          background:hsl(var(--accent));border:3px solid hsl(var(--card));
          box-shadow:0 0 0 1px hsl(var(--border));
        "></span>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      leaflet.marker([latitude, longitude], { icon: pin, title: label }).addTo(map);
    }

    draw();

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude, label]);

  return (
    <div>
      <div
        ref={containerRef}
        role="img"
        aria-label={`Map showing ${label}`}
        className="h-64 w-full overflow-hidden rounded-lg border border-border bg-muted"
      />
      <p className="mt-2 font-mono text-xs text-muted-foreground">
        {latitude.toFixed(5)}, {longitude.toFixed(5)}
      </p>
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
        target="_blank"
        rel="noreferrer"
        className="mt-1 inline-flex min-h-11 items-center text-base text-foreground underline decoration-accent decoration-2 underline-offset-4"
      >
        Open directions from {BUSINESS.city}
      </a>
    </div>
  );
}
