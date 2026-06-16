import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Ma carte fidélité — Natus",
  description: "Consultez vos points fidélité Natus Cosmétiques",
  appleWebApp: {
    capable: true,
    title: "Natus Fidélité",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFEFB",
  width: "device-width",
  initialScale: 1,
};

export default function CarteLayout({ children }: { children: React.ReactNode }) {
  return <div className="loyalty-carte-page">{children}</div>;
}
