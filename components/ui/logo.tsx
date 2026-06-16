import { cn } from "@/lib/utils";

const LOGO_SRC = "/logo-natus.svg";

const sizes = {
  sm: 40,
  md: 112,
  lg: 140,
  xl: 180,
} as const;

export function Logo({
  size = "md",
  collapsed = false,
  className,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  collapsed?: boolean;
  className?: string;
}) {
  const px = collapsed ? sizes.sm : sizes[size];

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_SRC}
      alt="Natus Marrakech"
      width={px}
      height={px}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
