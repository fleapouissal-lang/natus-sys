"use client";

import { useEffect, type ReactNode, type WheelEvent, type MouseEvent } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-2xl",
};

export function Modal({
  onClose,
  children,
  size = "md",
  className,
  scrollable = true,
}: {
  onClose: () => void;
  children: ReactNode;
  size?: keyof typeof sizeClasses;
  className?: string;
  scrollable?: boolean;
}) {
  useEffect(() => {
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onEscape);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  function handleBackdropClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleBackdropWheel(e: WheelEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-4"
      onClick={handleBackdropClick}
      onWheel={handleBackdropWheel}
      role="presentation"
    >
      <div
        className={cn("w-full", sizeClasses[size])}
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <Card
          className={cn(
            "animate-fade-in",
            scrollable && "max-h-[90vh] overflow-y-auto scrollbar-natus",
            className
          )}
        >
          {children}
        </Card>
      </div>
    </div>
  );
}
