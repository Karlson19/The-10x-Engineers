import { Archivo, JetBrains_Mono, Public_Sans } from "next/font/google";

/**
 * Self-hosted by next/font at build time, subset to latin, display swap.
 * There is no render blocking request to Google on a 3G connection.
 */

export const archivo = Archivo({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-archivo",
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

export const fontVariables = [archivo.variable, publicSans.variable, jetbrainsMono.variable].join(
  " ",
);
