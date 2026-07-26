import { Fraunces, JetBrains_Mono, Public_Sans } from "next/font/google";

/**
 * Self-hosted by next/font at build time, subset to latin, display swap.
 * There is no render blocking request to Google on a 3G connection.
 */

/** Display serif. The size contrast between this and the body is what makes the layout read as editorial. */
export const fraunces = Fraunces({
  subsets: ["latin"],
  // Two static instances rather than the full variable file. The variable build
  // carries every axis and is a much heavier download on a 3G connection.
  weight: ["400", "600"],
  variable: "--font-fraunces",
  display: "swap",
});

export const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-public-sans",
  display: "swap",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const fontVariables = [fraunces.variable, publicSans.variable, jetbrainsMono.variable].join(
  " ",
);
