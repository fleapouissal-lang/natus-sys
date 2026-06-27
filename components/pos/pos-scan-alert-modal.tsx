"use client";

import { useEffect } from "react";
import {
  AlertTriangle,
  BriefcaseBusiness,
  Clock,
  CreditCard,
  Gift,
  PackageX,
  SearchX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatCurrency } from "@/lib/utils";
import { isActiveProClient, PRO_CLIENT_DISCOUNT_PERCENT } from "@/lib/pro-client/discount";
import type { LoyaltyLookupBlocked, LoyaltyLookupResult } from "@/lib/loyalty/lookup-result";
import type { LoyaltyCustomer, Product } from "@/lib/types";

export type PosScanAlert =
  | { kind: "not_found"; barcode: string }
  | { kind: "out_of_stock"; product: Product }
  | { kind: "insufficient_stock"; product: Product; available: number }
  | { kind: "loyalty_not_found"; code: string }
  | { kind: "loyalty_deactivated"; code: string; customerName?: string; isPro?: boolean }
  | { kind: "loyalty_pending"; code: string; customerName: string; cardNumber: string }
  | { kind: "loyalty_pro_detected"; customerName: string; cardNumber: string }
  | { kind: "loyalty_normal_detected"; customerName: string; cardNumber: string; points: number };

export function createLoyaltyScanAlertFromLookup(
  code: string,
  result: LoyaltyLookupResult
): PosScanAlert {
  if ("error" in result) {
    return createLoyaltyScanAlert(code, "not_found");
  }
  if ("blocked" in result && result.blocked) {
    return createLoyaltyScanAlert(code, result.blocked, result.customer);
  }
  return createLoyaltyScanSuccessAlert(result.customer);
}

export function createLoyaltyScanAlert(
  code: string,
  blocked: "not_found" | LoyaltyLookupBlocked,
  customer?: LoyaltyCustomer | null
): PosScanAlert {
  if (blocked === "not_found") {
    return { kind: "loyalty_not_found", code };
  }

  if (blocked === "deactivated") {
    return {
      kind: "loyalty_deactivated",
      code,
      customerName: customer?.full_name,
      isPro: customer?.is_pro_client,
    };
  }

  return {
    kind: "loyalty_pending",
    code,
    customerName: customer?.full_name ?? "Client Pro",
    cardNumber: customer?.card_number ?? code,
  };
}

export function createLoyaltyScanSuccessAlert(customer: LoyaltyCustomer): PosScanAlert {
  if (isActiveProClient(customer)) {
    return {
      kind: "loyalty_pro_detected",
      customerName: customer.full_name,
      cardNumber: customer.card_number,
    };
  }

  return {
    kind: "loyalty_normal_detected",
    customerName: customer.full_name,
    cardNumber: customer.card_number,
    points: customer.loyalty_points,
  };
}

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
    case "loyalty_not_found":
      return {
        icon: SearchX,
        title: "Carte introuvable",
        message: "Aucune carte fidélité ou Pro ne correspond à ce scan.",
        detail: alert.code,
        tone: "text-danger",
        iconBg: "bg-danger/15 text-danger",
      };
    case "loyalty_deactivated":
      return {
        icon: CreditCard,
        title: "Carte désactivée",
        message: alert.customerName
          ? `${alert.customerName} — cette carte ne peut pas être utilisée en caisse`
          : "Cette carte ne peut pas être utilisée en caisse",
        detail: alert.isPro ? "Client Pro · désactivé" : alert.code,
        tone: "text-warning",
        iconBg: "bg-warning/15 text-warning",
        borderClass: "border-warning/25",
      };
    case "loyalty_pending":
      return {
        icon: Clock,
        title: "Compte Pro en attente",
        message: `${alert.customerName} — activation requise par le directeur`,
        detail: alert.cardNumber,
        tone: "text-warning",
        iconBg: "bg-warning/15 text-warning",
        borderClass: "border-warning/25",
      };
    case "loyalty_pro_detected":
      return {
        icon: BriefcaseBusiness,
        title: "Client Pro détecté",
        message: `${alert.customerName} — remise ${PRO_CLIENT_DISCOUNT_PERCENT}%, pas de points fidélité`,
        detail: alert.cardNumber,
        tone: "text-primary",
        iconBg: "bg-primary/15 text-primary",
        borderClass: "border-primary/25",
      };
    case "loyalty_normal_detected":
      return {
        icon: Gift,
        title: "Client fidélité détecté",
        message: `${alert.customerName} — ${alert.points} pts disponibles`,
        detail: alert.cardNumber,
        tone: "text-success",
        iconBg: "bg-success/15 text-success",
        borderClass: "border-success/25",
      };
  }
}

export function PosScanAlertToast({
  alert,
  onClose,
}: {
  alert: PosScanAlert | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(onClose, 4500);
    return () => clearTimeout(timer);
  }, [alert, onClose]);

  if (!alert) return null;

  const { icon: Icon, title, message, detail, tone, iconBg } = alertContent(alert);
  const borderClass =
    alert.kind === "loyalty_pro_detected"
      ? "border-primary/25"
      : alert.kind === "loyalty_normal_detected"
        ? "border-success/25"
        : alert.kind === "loyalty_deactivated" ||
            alert.kind === "loyalty_pending" ||
            alert.kind === "insufficient_stock"
          ? "border-warning/25"
          : "border-danger/25";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`pointer-events-auto fixed left-1/2 top-4 z-[110] w-[min(100vw-2rem,24rem)] -translate-x-1/2 animate-fade-in overflow-hidden rounded-lg border ${borderClass} bg-surface shadow-lg`}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <span
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${tone}`}>{title}</p>
          <p className="mt-0.5 text-sm text-foreground">{message}</p>
          <p className="mt-1 truncate font-mono text-xs text-muted">{detail}</p>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-muted hover:bg-page cursor-pointer"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
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
