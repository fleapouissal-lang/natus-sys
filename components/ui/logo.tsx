import { cn } from "@/lib/utils";

export function Logo({
  size = "md",
  collapsed = false,
  className,
}: {
  size?: "sm" | "md" | "lg";
  collapsed?: boolean;
  className?: string;
}) {
  if (collapsed) {
    return (
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center border border-primary bg-primary/10",
          className
        )}
        aria-label="Natus Marrakech"
      >
        <span className="font-[family-name:var(--font-cabin)] text-xl font-semibold text-primary">
          n
        </span>
      </div>
    );
  }

  const heights = { sm: 32, md: 48, lg: 64 };

  return (
    <svg
      viewBox="0 0 220 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      height={heights[size]}
      className={cn("w-auto", className)}
      aria-label="Natus Marrakech"
    >
      <text
        x="110"
        y="38"
        textAnchor="middle"
        fill="#B38C4A"
        style={{
          fontFamily: "var(--font-cabin), sans-serif",
          fontSize: "42px",
          fontWeight: 400,
          letterSpacing: "-0.02em",
        }}
      >
        natus
      </text>
      <text
        x="110"
        y="58"
        textAnchor="middle"
        fill="#B38C4A"
        opacity="0.65"
        style={{
          fontFamily: "var(--font-jost), sans-serif",
          fontSize: "11px",
          fontWeight: 400,
          letterSpacing: "0.35em",
        }}
      >
        MARRAKECH
      </text>
    </svg>
  );
}
