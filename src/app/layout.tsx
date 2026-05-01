import { InstallPrompt } from "@/components/pwa/install-prompt";
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker-registrar";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wealthwise — Financial Architect Terminal",
  description: "Personal finance planner with CSR 50/30/20, debt strategy, and AI advisor",
  manifest: "/manifest.webmanifest",
  applicationName: "Wealthwise",
  appleWebApp: {
    capable: true,
    title: "Wealthwise",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Different theme color in dark mode so the OS chrome blends in.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f172a" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        {children}
        <ServiceWorkerRegistrar />
        <InstallPrompt />
      </body>
    </html>
  );
}
