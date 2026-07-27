import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Chrysmec Auto Center",
  description: "Book, dispatch, and track mobile mechanical & electrical service.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#1C1E1F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
