import { cn } from "@/lib/utils";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function UserAvatar({
  name,
  className,
  title,
  size = "md",
}: {
  name: string;
  className?: string;
  title?: string;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "sm" ? "h-9 w-9 text-xs" : "h-10 w-10 text-sm";

  return (
    <div
      title={title ?? name}
      aria-label={title ?? name}
      role="img"
      className={cn(
        "avatar-round flex shrink-0 items-center justify-center border border-black bg-white/50 font-semibold text-black",
        sizeClass,
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
