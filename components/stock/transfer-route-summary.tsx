import { MapPin, Store } from "lucide-react";

export function TransferRouteSummary({
  source,
  destination,
  className = "",
}: {
  source: string;
  destination: string;
  className?: string;
}) {
  return (
    <div className={`mt-2 space-y-1.5 text-sm ${className}`}>
      <p className="flex items-start gap-2 text-foreground">
        <Store className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" aria-hidden />
        <span>
          <span className="font-medium text-muted">Source ·</span> {source}
        </span>
      </p>
      <p className="flex items-start gap-2 text-foreground">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" aria-hidden />
        <span>
          <span className="font-medium text-muted">Destination ·</span> {destination}
        </span>
      </p>
    </div>
  );
}
