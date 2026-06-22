"use client";

import { cn } from "@/lib/utils";

export type PosMobileCartStep = "loyalty" | "products" | "payment";

const STEP_LABELS: Record<PosMobileCartStep, string> = {
  loyalty: "Fidélité",
  products: "Produits",
  payment: "Paiement",
};

export function PosMobileCartStepBar({
  step,
  steps,
  onStepChange,
}: {
  step: PosMobileCartStep;
  steps: PosMobileCartStep[];
  onStepChange: (step: PosMobileCartStep) => void;
}) {
  const currentIndex = steps.indexOf(step);

  return (
    <div className="natus-pos-cart-steps shrink-0 px-4 py-3">
      <div className="flex gap-1">
        {steps.map((id, index) => {
          const isActive = id === step;
          const isDone = index < currentIndex;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onStepChange(id)}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-center transition-colors",
                isActive && "natus-pos-cart-step--active",
                !isActive && isDone && "natus-pos-cart-step--done",
                !isActive && !isDone && "natus-pos-cart-step"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                  isActive && "bg-primary text-white",
                  !isActive && isDone && "bg-champagne text-black",
                  !isActive && !isDone && "bg-primary/10 text-primary"
                )}
              >
                {index + 1}
              </span>
              <span className="w-full truncate text-[10px] font-semibold">{STEP_LABELS[id]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function resolveMobileCartSteps(skipLoyalty: boolean): PosMobileCartStep[] {
  if (skipLoyalty) return ["products", "payment"];
  return ["loyalty", "products", "payment"];
}
