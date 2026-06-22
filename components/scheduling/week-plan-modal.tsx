"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { planCashierWeek } from "@/lib/actions";
import { formatWeekRangeLabel } from "@/lib/scheduling/week";

export function WeekPlanModal({
  storeId,
  storeName,
  weekStart,
  cashierCount,
  onClose,
}: {
  storeId: string;
  storeName: string;
  weekStart: string;
  cashierCount: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("15:00");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    startTransition(async () => {
      const response = await planCashierWeek({
        storeId,
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
        Crée un créneau pour chaque caissier du magasin, du lundi au samedi, sauf jour de repos ou
        créneau déjà existant ({cashierCount} caissier{cashierCount !== 1 ? "s" : ""}).
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
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
          <Button type="submit" loading={pending}>
            <CalendarRange className="h-4 w-4" />
            Planifier
          </Button>
        </div>
      </form>
    </Modal>
  );
}
