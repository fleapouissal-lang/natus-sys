import type { Metadata, Viewport } from "next";
import { Jost } from "next/font/google";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { PwaRegister } from "@/components/pwa/pwa-register";
import "./globals.css";

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Natus POS — Marrakech",
  description: "Application de caisse pour magasin de cosmétiques Natus Marrakech",
  applicationName: "Natus",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Natus",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#B38C4A",
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
        {children}
        <PwaRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
