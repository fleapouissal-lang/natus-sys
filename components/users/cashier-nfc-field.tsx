"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { assignCashierNfcCard, removeCashierNfcCard } from "@/lib/pos/actions";

export function CashierNfcField({
  cashierId,
  initialUid,
}: {
  cashierId: string;
  initialUid?: string | null;
}) {
  const router = useRouter();
  const [uid, setUid] = useState(initialUid ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSave() {
    setError("");
    startTransition(async () => {
      const result = await assignCashierNfcCard({
        cashierId,
        nfcUid: uid,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleRemove() {
    setError("");
    startTransition(async () => {
      const result = await removeCashierNfcCard(cashierId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setUid("");
      router.refresh();
    });
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-border bg-surface-2 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted">
        <CreditCard className="h-3.5 w-3.5" />
        Carte NFC caissier
      </div>
      <Input
        value={uid}
        onChange={(e) => setUid(e.target.value)}
        placeholder="UID badge NFC"
        className="text-xs"
      />
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={pending || !uid.trim()} onClick={handleSave}>
          Enregistrer
        </Button>
        {initialUid && (
          <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={handleRemove}>
            Retirer
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
