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
  applicationName: "Natus POS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Natus POS",
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
