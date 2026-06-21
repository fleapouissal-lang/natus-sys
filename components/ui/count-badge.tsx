import { cn } from "@/lib/utils";

/** Pastille de compteur (bouton commandes, cloche notification). */
export function CountBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        "pointer-events-none absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border border-white/80 bg-[#B38C4A] px-1 text-[10px] font-bold leading-none text-white shadow-sm",
        className
      )}
      aria-hidden
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
