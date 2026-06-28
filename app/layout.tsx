import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
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

/**
 * Sous-domaine public dédié aux réclamations : aucune PWA (pas de manifest,
 * pas de service worker, pas d'invite d'installation).
 */
async function isReclamationsHost(): Promise<boolean> {
  const host = (await headers()).get("host") ?? "";
  return host.split(":")[0].toLowerCase().startsWith("reclamations.");
}

export async function generateMetadata(): Promise<Metadata> {
  const reclamationsHost = await isReclamationsHost();

  return {
    title: reclamationsHost ? "Réclamation client — Natus" : "Natus POS",
    description: "Application de caisse Natus Cosmétiques",
    applicationName: "natus",
    // Pas de manifest sur le sous-domaine réclamations → site non installable.
    ...(reclamationsHost ? {} : { manifest: "/manifest.webmanifest" }),
    icons: {
      icon: [
        { url: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/pwa/icon.svg", type: "image/svg+xml" },
      ],
      apple: [{ url: "/pwa/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    ...(reclamationsHost
      ? {}
      : {
          appleWebApp: {
            capable: true,
            statusBarStyle: "default",
            title: "natus",
          },
        }),
    formatDetection: {
      telephone: false,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#EBD4BA",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const reclamationsHost = await isReclamationsHost();

  return (
    <html
      lang="fr"
      className={`${jost.variable} h-full antialiased`}
      style={{ colorScheme: "light" }}
    >
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        <NatusShellEffects />
        {children}
        {!reclamationsHost && (
          <>
            <PwaRegister />
            <InstallPrompt />
          </>
        )}
      </body>
    </html>
  );
}
