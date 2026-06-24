"use client";

import { AlertTriangle, WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/lib/hooks/use-network-status";
import { cn } from "@/lib/utils";

const MESSAGES = {
  offline: {
    title: "Connexion perdue",
    description: "Vérifiez votre Wi‑Fi ou vos données mobiles.",
    Icon: WifiOff,
    className: "border-danger/35 bg-danger text-white",
  },
  unstable: {
    title: "Connexion instable",
    description:
      "Le réseau est faible — enregistrez vos ventes et réessayez si une action échoue.",
    Icon: AlertTriangle,
    className: "border-warning/40 bg-warning text-white",
  },
} as const;

export function ConnectionStatusBanner() {
  const quality = useNetworkStatus();

  if (quality === "good") return null;

  const { title, description, Icon, className } = MESSAGES[quality];

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex shrink-0 items-start gap-3 border-b px-4 py-2.5 text-sm shadow-sm animate-fade-in",
        className
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="font-medium leading-tight">{title}</p>
        <p className="mt-0.5 text-xs leading-snug opacity-90">{description}</p>
      </div>
    </div>
  );
}
