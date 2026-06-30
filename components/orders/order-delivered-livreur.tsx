import { UserRound } from "lucide-react";

/** Livreur ayant livré la commande (affiché une fois le statut « Livré »). */
export function OrderDeliveredLivreur({
  name,
  className = "",
  inline = false,
}: {
  name?: string | null;
  className?: string;
  inline?: boolean;
}) {
  if (!name?.trim()) return null;

  if (inline) {
    return (
      <span className={`text-xs text-foreground/85 ${className}`}>
        <UserRound className="mr-1 inline h-3 w-3 opacity-70" aria-hidden />
        Livré par <span className="font-medium">{name}</span>
      </span>
    );
  }

  return (
    <p
      className={`flex items-center gap-1 text-xs text-primary/85 ${className}`}
    >
      <UserRound className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
      <span>
        <span className="font-medium text-foreground/80">Livré par :</span> {name}
      </span>
    </p>
  );
}
