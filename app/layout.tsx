import type { Metadata, Viewport } from "next";
import { Jost } from "next/font/google";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { NatusShellEffects } from "@/components/layout/natus-shell-effects";
import "./globals.css";

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Natus POS",
  description: "Application de caisse Natus Cosmétiques",
  applicationName: "natus",
  icons: {
    icon: [
      { url: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/pwa/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "natus",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#EBD4BA",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${jost.variable} h-full antialiased`}
      style={{ colorScheme: "light" }}
    >
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        <NatusShellEffects />
        {children}
        <PwaRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
