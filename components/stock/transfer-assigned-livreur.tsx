import { UserRound } from "lucide-react";

/** Affiche le livreur assigné à un transfert de stock (source ou destination). */
export function TransferAssignedLivreur({
  name,
  className = "mt-1",
  compact = false,
}: {
  name?: string | null;
  className?: string;
  /** Colonne tableau : nom seul, sans libellé long. */
  compact?: boolean;
}) {
  if (!name?.trim()) {
    if (compact) {
      return <span className={`text-muted ${className}`}>—</span>;
    }
    return null;
  }

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 font-medium text-foreground ${className}`}>
        <UserRound className="h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden />
        {name}
      </span>
    );
  }

  return (
    <p className={`flex items-center gap-1 text-xs text-primary/85 ${className}`}>
      <UserRound className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
      <span>
        <span className="font-medium text-foreground/80">Livreur assigné :</span> {name}
      </span>
    </p>
  );
}
