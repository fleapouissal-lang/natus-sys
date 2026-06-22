"use client";

import { LogOut, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export function PosOperatorBar({
  operatorName,
  authMethod,
  onSwitch,
  switching = false,
}: {
  operatorName: string;
  authMethod?: "password" | "nfc";
  onSwitch: () => void;
  switching?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
          <UserRound className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{operatorName}</p>
          <p className="text-xs text-muted">
            Caissier connecté
            {authMethod === "nfc" ? " · carte NFC" : ""}
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={switching}
        onClick={onSwitch}
        className={cn(
          "inline-flex shrink-0 items-center gap-2 rounded-[10px] bg-black px-3 py-2.5 text-sm font-medium text-champagne transition-opacity hover:opacity-90",
          "cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <LogOut className="h-4 w-4 shrink-0" />
        Changer caissier
      </button>
    </div>
  );
}
