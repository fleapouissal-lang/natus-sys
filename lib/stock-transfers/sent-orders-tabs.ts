import { ArrowRightLeft, ClipboardList, PackagePlus } from "lucide-react";

export type SentOrdersTabId = "new" | "sent" | "history";

export const SENT_ORDERS_TAB_CONFIG: {
  id: SentOrdersTabId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "new",
    label: "Nouveau transfert",
    shortLabel: "Nouveau",
    icon: PackagePlus,
  },
  {
    id: "sent",
    label: "Stock envoyé",
    shortLabel: "Envoyé",
    icon: ArrowRightLeft,
  },
  {
    id: "history",
    label: "Historique des commandes",
    shortLabel: "Historique",
    icon: ClipboardList,
  },
];

export function resolveSentOrdersTab(
  tabParam: string | null,
  legacySentValues: string[] = []
): SentOrdersTabId {
  if (tabParam === "history") return "history";
  if (
    tabParam === "sent" ||
    legacySentValues.includes(tabParam || "")
  ) {
    return "sent";
  }
  if (tabParam === "new") return "new";
  return "sent";
}
