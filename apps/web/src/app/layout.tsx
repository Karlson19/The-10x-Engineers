import type { Metadata, Viewport } from "next";
import { BUSINESS } from "@chrysmec/shared";
import { AppProviders } from "@/components/providers/app-providers";
import { MotionProvider } from "@/components/shared/motion-provider";
import { ServiceWorkerRefresh } from "@/components/shared/service-worker-refresh";
import { ThemeProvider, themeInitScript } from "@/components/shared/theme-provider";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${BUSINESS.name}, vehicle repair and servicing in ${BUSINESS.city}`,
    template: `%s | ${BUSINESS.name}`,
  },
  description: `Book mechanical and electrical vehicle repair with ${BUSINESS.name} in ${BUSINESS.city}, and follow the job from booking to handover.`,
  applicationName: BUSINESS.name,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F8FC" },
    { media: "(prefers-color-scheme: dark)", color: "#0C0E1A" },
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
          <MotionProvider>
            {/*
              One query client and one session for the whole app. These used to
              sit in each route group's layout, which meant moving between
              groups, signing in being the obvious case, threw the cache away
              and restored the session all over again. That is what put people
              into the account the browser was last used with.
            */}
            <ServiceWorkerRefresh />
            <AppProviders>{children}</AppProviders>
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
