"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { SelectMenu } from "@/components/ui/select-menu";
import { planCashierWeek } from "@/lib/actions";
import { formatWeekRangeLabel } from "@/lib/scheduling/week";
import type { CashierWithStore } from "@/lib/scheduling/shifts";

export function WeekPlanModal({
  storeId,
  storeName,
  weekStart,
  planningCashiers,
  onClose,
}: {
  storeId: string;
  storeName: string;
  weekStart: string;
  planningCashiers: CashierWithStore[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [cashierId, setCashierId] = useState(planningCashiers[0]?.id || "");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("15:00");

  const cashierOptions = useMemo(
    () =>
      planningCashiers.map((c) => ({
        value: c.id,
        label: c.full_name || c.email,
        description: c.store_name,
      })),
    [planningCashiers]
  );

  const selectedCashier = planningCashiers.find((c) => c.id === cashierId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cashierId) {
      setError("Sélectionnez un caissier");
      return;
    }
    setError("");
    setResult(null);
    startTransition(async () => {
      const response = await planCashierWeek({
        storeId,
        cashierId,
        weekStart,
        startTime,
        endTime,
      });
      if ("error" in response) {
        setError(response.error);
        return;
      }
      setResult(
        `${response.created} créneau${response.created !== 1 ? "x" : ""} planifié${response.created !== 1 ? "s" : ""}` +
          (response.skipped > 0 ? ` · ${response.skipped} ignoré${response.skipped !== 1 ? "s" : ""}` : "")
      );
      router.refresh();
    });
  }

  return (
    <Modal onClose={onClose} size="md">
      <h3 className="text-lg font-semibold">Planifier la semaine</h3>
      <p className="mt-1 text-sm text-muted">
        {storeName} · semaine du {formatWeekRangeLabel(weekStart)}
      </p>
      <p className="mt-2 text-sm text-muted">
        Sélectionnez un caissier, puis créez ses créneaux du lundi au samedi (hors jour de repos et
        créneaux déjà existants).
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <SelectMenu
          label="Caissier"
          value={cashierId}
          onChange={setCashierId}
          options={cashierOptions}
          searchable={cashierOptions.length > 6}
          required
        />

        {selectedCashier && (
          <p className="text-xs text-muted">
            Planning hebdomadaire pour {selectedCashier.full_name || selectedCashier.email}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Heure début"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            className="w-full"
          />
          <Input
            label="Heure fin"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            className="w-full"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}
        {result && (
          <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{result}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Fermer
          </Button>
          <Button type="submit" loading={pending} disabled={!cashierId}>
            <CalendarRange className="h-4 w-4" />
            Planifier
          </Button>
        </div>
      </form>
    </Modal>
  );
}
