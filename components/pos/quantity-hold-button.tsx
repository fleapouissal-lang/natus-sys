"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const HOLD_DELAY_MS = 450;
const HOLD_REPEAT_MS = 120;
const HOLD_STEP = 10;

export function QuantityHoldButton({
  onStep,
  direction,
  disabled = false,
  ariaLabel,
  className,
  children,
}: {
  onStep: (delta: number) => void;
  direction: "up" | "down";
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
  children: ReactNode;
}) {
  const holdActive = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const tapStep = direction === "up" ? 1 : -1;
  const holdDelta = direction === "up" ? HOLD_STEP : -HOLD_STEP;

  function clearTimers() {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (repeatTimer.current) {
      clearInterval(repeatTimer.current);
      repeatTimer.current = null;
    }
  }

  function stopHold() {
    clearTimers();
  }

  function startHold() {
    if (disabled) return;
    holdActive.current = false;
    clearTimers();

    holdTimer.current = setTimeout(() => {
      holdActive.current = true;
      onStep(holdDelta);
      repeatTimer.current = setInterval(() => onStep(holdDelta), HOLD_REPEAT_MS);
    }, HOLD_DELAY_MS);
  }

  function handleClick() {
    if (disabled || holdActive.current) {
      holdActive.current = false;
      return;
    }
    onStep(tapStep);
  }

  useEffect(() => () => clearTimers(), []);

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={handleClick}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        startHold();
      }}
      onPointerUp={stopHold}
      onPointerLeave={stopHold}
      onPointerCancel={stopHold}
      className={cn(className)}
    >
      {children}
    </button>
  );
}
