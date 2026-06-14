"use client";

import { Banknote, CreditCard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatCurrency } from "@/lib/utils";
import type { PaymentMethod } from "@/lib/types";

export function PaymentModal({
  total,
  loading,
  onPay,
  onClose,
}: {
  total: number;
  loading: boolean;
  onPay: (method: PaymentMethod) => void;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose} size="sm" scrollable={false}>
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Mode de paiement</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-6 text-center text-3xl font-bold text-primary">
          {formatCurrency(total)}
        </p>

        <div className="grid gap-3">
          <Button
            size="lg"
            className="h-16 w-full text-base"
            loading={loading}
            onClick={() => onPay("cash")}
          >
            <Banknote className="h-6 w-6" />
            Espèces
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="h-16 w-full text-base"
            loading={loading}
            onClick={() => onPay("card")}
          >
            <CreditCard className="h-6 w-6" />
            Carte bancaire
          </Button>
        </div>
    </Modal>
  );
}
