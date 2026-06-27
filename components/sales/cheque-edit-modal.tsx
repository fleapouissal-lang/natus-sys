"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select-menu";
import { MOROCCAN_BANKS } from "@/lib/constants/banks";
import { updateSaleChequeDetails } from "@/lib/sales/cheques/actions";
import type { SaleChequeRow } from "@/lib/sales/cheques/types";
import { formatCurrency } from "@/lib/utils";

export function ChequeEditModal({
  cheque,
  onClose,
  onSaved,
}: {
  cheque: SaleChequeRow;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [bankName, setBankName] = useState(cheque.bank_name);
  const [chequeNumber, setChequeNumber] = useState(cheque.cheque_number);
  const [chequeAmount, setChequeAmount] = useState(String(cheque.cheque_amount));
  const [drawerName, setDrawerName] = useState(cheque.drawer_name ?? "");
  const [issueDate, setIssueDate] = useState(cheque.issue_date ?? "");
  const [notes, setNotes] = useState(cheque.notes ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const saleTotal = cheque.sale?.total ?? 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const amount = Number.parseFloat(chequeAmount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Montant invalide");
      return;
    }
    if (amount < saleTotal) {
      setError(`Le montant doit couvrir au moins ${formatCurrency(saleTotal)}`);
      return;
    }

    startTransition(async () => {
      const result = await updateSaleChequeDetails(cheque.id, {
        bankName,
        chequeNumber,
        chequeAmount: amount,
        drawerName: drawerName || undefined,
        issueDate: issueDate || undefined,
        notes: notes || undefined,
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }

      onSaved?.();
      onClose();
    });
  }

  return (
    <Modal onClose={onClose} size="md">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Modifier le chèque</h3>
          <p className="mt-1 text-sm text-muted">
            Vente {formatCurrency(saleTotal)} · N° {cheque.cheque_number}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-muted hover:text-foreground cursor-pointer"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <SelectMenu
          label="Banque"
          value={bankName}
          onChange={setBankName}
          options={MOROCCAN_BANKS.map((bank) => ({ value: bank, label: bank }))}
          required
        />

        <Input
          label="N° de chèque"
          value={chequeNumber}
          onChange={(e) => setChequeNumber(e.target.value.replace(/\s/g, ""))}
          inputMode="numeric"
          required
        />

        <Input
          label="Montant du chèque (DH)"
          value={chequeAmount}
          onChange={(e) => setChequeAmount(e.target.value)}
          inputMode="decimal"
          required
        />

        <Input
          label="Nom du tireur (optionnel)"
          value={drawerName}
          onChange={(e) => setDrawerName(e.target.value)}
        />

        <Input
          label="Date du chèque (optionnel)"
          type="date"
          value={issueDate}
          onChange={(e) => setIssueDate(e.target.value)}
        />

        <Input
          label="Note (optionnel)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {error ? (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        ) : null}

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" className="flex-1" loading={pending}>
            Enregistrer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
