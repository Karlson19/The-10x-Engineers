import type { MetadataRoute } from "next";
import { BUSINESS } from "@chrysmec/shared";

/**
 * Installable on a phone, which is the point: a technician or a customer adds
 * it to their home screen and it opens like an app, without a browser bar
 * eating 60px of a small screen.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BUSINESS.name,
    short_name: "Chrysmec",
    description:
      "Book mechanical and electrical vehicle repair, and follow the job from booking to handover.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F7F8FC",
    theme_color: "#2E3192",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
