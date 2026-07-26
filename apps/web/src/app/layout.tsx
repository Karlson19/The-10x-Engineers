import type { Metadata, Viewport } from "next";
import { BUSINESS } from "@chrysmec/shared";
import { MotionProvider } from "@/components/shared/motion-provider";
import { ThemeProvider, themeInitScript } from "@/components/shared/theme-provider";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${BUSINESS.name}, vehicle repair and servicing in Accra`,
    template: `%s | ${BUSINESS.name}`,
  },
  description:
    "Book mechanical and electrical vehicle repair with Chrysmec Auto Center in Accra, and follow the job from booking to handover.",
  applicationName: BUSINESS.name,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0F2942" },
    { media: "(prefers-color-scheme: dark)", color: "#080F1A" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Sets the theme class before first paint so there is no flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${fontVariables} min-h-dvh antialiased`}>
        <ThemeProvider>
          <MotionProvider>{children}</MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
