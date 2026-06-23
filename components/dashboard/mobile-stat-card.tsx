import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type MobileStatVariant = "default" | "gold" | "success" | "warning" | "danger";

const VARIANT_STYLES: Record<MobileStatVariant, string> = {
  default: "border-primary/20 bg-surface shadow-[0_4px_20px_rgba(179,140,74,0.08)]",
  gold: "border-primary/35 bg-champagne shadow-[0_4px_20px_rgba(179,140,74,0.1)]",
  success: "border-success/25 bg-surface shadow-[0_4px_20px_rgba(46,125,50,0.06)]",
  warning: "border-warning/30 bg-surface shadow-[0_4px_20px_rgba(179,140,74,0.08)]",
  danger: "border-danger/25 bg-surface shadow-[0_4px_20px_rgba(198,40,40,0.06)]",
};

const ICON_STYLES: Record<MobileStatVariant, string> = {
  default: "bg-primary/12 text-primary",
  gold: "bg-primary/20 text-primary-dark",
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-primary-dark",
  danger: "bg-danger/12 text-danger",
};

export function MobileStatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
  className,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: MobileStatVariant;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "natus-mobile-kpi-card rounded-2xl border p-4 transition-transform active:scale-[0.98]",
        VARIANT_STYLES[variant],
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-1 font-heading text-2xl font-bold leading-none text-foreground">{value}</p>
          {subtitle ? <p className="mt-1.5 text-[11px] text-muted">{subtitle}</p> : null}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            ICON_STYLES[variant]
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function MobileStatGrid({
  children,
  className,
  columns = 2,
}: {
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2;
}) {
  return (
    <div
      className={cn(
        "grid gap-3 md:hidden",
        columns === 1 ? "grid-cols-1" : "grid-cols-2",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DesktopStatGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-4", className)}>{children}</div>
  );
}
