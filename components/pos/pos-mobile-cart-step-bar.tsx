"use client";

import { cn } from "@/lib/utils";

export type PosMobileCartStep = "cart" | "payment";

const STEP_LABELS: Record<PosMobileCartStep, string> = {
  cart: "Panier",
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
  if (steps.length <= 1) return null;

  return (
    <div className="natus-pos-checkout-pills shrink-0 px-4 py-2">
      <div className="natus-pos-checkout-pills-track" role="tablist" aria-label="Étapes de validation de la vente">
        {steps.map((id, index) => {
          const isActive = id === step;
          const isDone = steps.indexOf(step) > index;

          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onStepChange(id)}
              className={cn(
                "natus-pos-checkout-pill",
                isActive && "natus-pos-checkout-pill--active",
                isDone && !isActive && "natus-pos-checkout-pill--done"
              )}
            >
              <span className="natus-pos-checkout-pill-num">{index + 1}</span>
              <span className="natus-pos-checkout-pill-label">{STEP_LABELS[id]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function resolveMobileCartSteps(skipCartStep: boolean): PosMobileCartStep[] {
  if (skipCartStep) return ["payment"];
  return ["cart", "payment"];
}
