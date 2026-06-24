"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { resolveAvatarDisplayUrl } from "@/lib/profile/avatar-url";

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
  avatarUrl,
  className,
  title,
  size = "md",
}: {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  title?: string;
  size?: "sm" | "md" | "lg";
}) {
  const [imageError, setImageError] = useState(false);
  const sizeClass =
    size === "sm" ? "h-9 w-9 text-xs" : size === "lg" ? "h-24 w-24 text-xl" : "h-10 w-10 text-sm";
  const src = resolveAvatarDisplayUrl(avatarUrl);

  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  if (src && !imageError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        title={title ?? name}
        onError={() => setImageError(true)}
        className={cn(
          "avatar-round shrink-0 border border-black/15 object-cover bg-white/50",
          sizeClass,
          className
        )}
      />
    );
  }

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
