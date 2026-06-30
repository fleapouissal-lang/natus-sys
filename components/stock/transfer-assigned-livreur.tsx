import { UserRound } from "lucide-react";

/** Affiche le livreur assigné à un transfert de stock (source ou destination). */
export function TransferAssignedLivreur({
  name,
  className = "mt-1",
}: {
  name?: string | null;
  className?: string;
}) {
  if (!name?.trim()) return null;

  return (
    <p className={`flex items-center gap-1 text-xs text-primary/85 ${className}`}>
      <UserRound className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
      <span>
        <span className="font-medium text-foreground/80">Livreur assigné :</span> {name}
      </span>
    </p>
  );
}
