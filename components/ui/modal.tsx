"use client";

import { useEffect, type ReactNode, type MouseEvent } from "react";
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
  closeOnBackdrop = true,
  closeOnEscape = true,
}: {
  onClose: () => void;
  children: ReactNode;
  size?: keyof typeof sizeClasses;
  className?: string;
  scrollable?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
}) {
  useEffect(() => {
    if (!closeOnEscape) return;

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
  }, [onClose, closeOnEscape]);

  useEffect(() => {
    if (closeOnEscape) return;

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [closeOnEscape]);

  function handleBackdropClick(e: MouseEvent<HTMLDivElement>) {
    if (!closeOnBackdrop) return;
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-4"
      onClick={handleBackdropClick}
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
