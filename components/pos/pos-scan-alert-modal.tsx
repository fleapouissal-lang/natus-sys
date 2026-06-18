"use client";

import { AlertTriangle, PackageX, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/lib/types";

export type PosScanAlert =
  | { kind: "not_found"; barcode: string }
  | { kind: "out_of_stock"; product: Product }
  | { kind: "insufficient_stock"; product: Product; available: number };

function alertContent(alert: PosScanAlert) {
  switch (alert.kind) {
    case "not_found":
      return {
        icon: SearchX,
        title: "Produit introuvable",
        message: "Aucun produit ne correspond à ce code-barres dans ce magasin.",
        detail: alert.barcode,
        tone: "text-danger",
        iconBg: "bg-danger/15 text-danger",
      };
    case "out_of_stock":
      return {
        icon: PackageX,
        title: "Rupture de stock",
        message: `${alert.product.name} n'est plus disponible à la vente.`,
        detail: `Stock actuel : 0 · ${formatCurrency(alert.product.price)} · ${alert.product.barcode}`,
        tone: "text-danger",
        iconBg: "bg-danger/15 text-danger",
      };
    case "insufficient_stock":
      return {
        icon: AlertTriangle,
        title: "Stock insuffisant",
        message: `Il reste seulement ${alert.available} unité${alert.available !== 1 ? "s" : ""} de ${alert.product.name}.`,
        detail: `Code-barres : ${alert.product.barcode}`,
        tone: "text-warning",
        iconBg: "bg-warning/15 text-warning",
      };
  }
}

export function PosScanAlertModal({
  alert,
  onClose,
}: {
  alert: PosScanAlert | null;
  onClose: () => void;
}) {
  if (!alert) return null;

  const { icon: Icon, title, message, detail, tone, iconBg } = alertContent(alert);

  return (
    <Modal onClose={onClose} size="sm" scrollable={false}>
      <div className="flex flex-col items-center px-2 py-4 text-center">
        <div
          className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full ${iconBg}`}
        >
          <Icon className="h-7 w-7" />
        </div>
        <h3 className={`text-lg font-bold ${tone}`}>{title}</h3>
        <p className="mt-2 text-sm text-foreground">{message}</p>
        <p className="mt-3 rounded-lg bg-page px-3 py-2 font-mono text-xs text-muted">
          {detail}
        </p>
        <Button type="button" className="mt-6 w-full" size="lg" onClick={onClose}>
          Compris
        </Button>
      </div>
    </Modal>
  );
}
