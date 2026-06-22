"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ArrowRightLeft,
  CalendarOff,
  CalendarPlus,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { SelectMenu } from "@/components/ui/select-menu";
import { Badge } from "@/components/ui/badge";
import { PlanningFilterBar } from "@/components/scheduling/planning-filter-bar";
import { CashierTransferModal } from "@/components/scheduling/cashier-transfer-modal";
import { WeekPlanModal } from "@/components/scheduling/week-plan-modal";
import {
  clearCashierWeekOff,
  createCashierShift,
  deleteCashierShift,
  setCashierWeekOff,
} from "@/lib/actions";
import {
  addWeeks,
  formatShiftDate,
  formatTimeLabel,
  formatWeekRangeLabel,
  getWeekDays,
} from "@/lib/scheduling/week";
import { isCashierOffOnDate } from "@/lib/scheduling/week-off-utils";
import type { CashierWeekOff } from "@/lib/scheduling/week-off-utils";
import {
  availableCashiersForShift,
  type CashierStoreTransfer,
} from "@/lib/scheduling/transfer-utils";
import type { CashierShift, CashierWithStore } from "@/lib/scheduling/shifts";
import type { Store } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  stores: Store[];
  planningCashiers: CashierWithStore[];
  shifts: CashierShift[];
  allShifts: CashierShift[];
  weekOffs: CashierWeekOff[];
  transfers: CashierStoreTransfer[];
  weekStart: string;
  selectedStoreId: string;
};

export function CashierScheduleManager({
  stores,
  planningCashiers,
  shifts,
  allShifts,
  weekOffs,
  transfers,
  weekStart,
  selectedStoreId,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [weekOffError, setWeekOffError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [weekPlanOpen, setWeekPlanOpen] = useState(false);
  const [transferCashier, setTransferCashier] = useState<CashierWithStore | null>(null);

  const [cashierId, setCashierId] = useState("");
  const [shiftDate, setShiftDate] = useState(weekStart);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("15:00");
  const [notes, setNotes] = useState("");

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const selectedStore = stores.find((s) => s.id === selectedStoreId);

  const dayOffOptions = useMemo(
    () => [
      { value: "", label: "Pas de repos", icon: CalendarOff },
      ...weekDays.map((d) => ({
        value: d,
        label: formatShiftDate(d),
        icon: CalendarOff,
      })),
    ],
    [weekDays]
  );

  const shiftByCashierDay = useMemo(() => {
    const map = new Map<string, CashierShift>();
    for (const shift of shifts) {
      map.set(`${shift.cashier_id}:${shift.shift_date}`, shift);
    }
    return map;
  }, [shifts]);

  const weekOffByCashier = useMemo(() => {
    const map = new Map<string, string>();
    for (const off of weekOffs) map.set(off.cashier_id, off.off_date);
    return map;
  }, [weekOffs]);

  const availableForModal = useMemo(
    () =>
      selectedStoreId
        ? availableCashiersForShift({
            storeId: selectedStoreId,
            shiftDate,
            cashiers: planningCashiers,
            allShifts,
            weekOffs,
            transfers,
          })
        : [],
    [selectedStoreId, shiftDate, planningCashiers, allShifts, weekOffs, transfers]
  );

  const cashierOptions = useMemo(
    () =>
      availableForModal.map((c) => ({
        value: c.id,
        label: c.full_name || c.email,
        description: c.store_name,
      })),
    [availableForModal]
  );

  useEffect(() => {
    if (!cashierId || !availableForModal.some((c) => c.id === cashierId)) {
      setCashierId(availableForModal[0]?.id || "");
    }
  }, [availableForModal, cashierId]);

  function pushQuery(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const q = params.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  }

  function openAddModal(cId?: string, date?: string) {
    if (!selectedStoreId) return;
    setError("");
    setShiftDate(date || weekStart);
    setCashierId(cId || planningCashiers[0]?.id || "");
    setStartTime("10:00");
    setEndTime("15:00");
    setNotes("");
    setModalOpen(true);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStoreId) return;
    setError("");
    if (isCashierOffOnDate(weekOffs, cashierId, shiftDate)) {
      setError("Ce jour est le jour de repos de ce caissier");
      return;
    }
    startTransition(async () => {
      const result = await createCashierShift({
        storeId: selectedStoreId,
        cashierId,
        shiftDate,
        startTime,
        endTime,
        notes,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setModalOpen(false);
      router.refresh();
    });
  }

  function handleDelete(shiftId: string) {
    if (!confirm("Supprimer ce créneau ?")) return;
    startTransition(async () => {
      const result = await deleteCashierShift(shiftId);
      if ("error" in result) setError(result.error);
      else router.refresh();
    });
  }

  function handleWeekOffChange(cId: string, offDate: string) {
    setWeekOffError("");
    startTransition(async () => {
      if (!offDate) {
        const result = await clearCashierWeekOff({ cashierId: cId, weekStart });
        if ("error" in result) setWeekOffError(result.error);
        else router.refresh();
        return;
      }
      const result = await setCashierWeekOff({ cashierId: cId, weekStart, offDate });
      if ("error" in result) setWeekOffError(result.error);
      else router.refresh();
    });
  }

  const cashiersWithoutOff = planningCashiers.filter((c) => !weekOffByCashier.has(c.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => pushQuery({ week: addWeeks(weekStart, -1) })}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="min-w-[14rem] text-center text-sm font-semibold text-foreground">
            Semaine du {formatWeekRangeLabel(weekStart)}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => pushQuery({ week: addWeeks(weekStart, 1) })}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button
          type="button"
          onClick={() => setWeekPlanOpen(true)}
          disabled={!selectedStoreId || planningCashiers.length === 0}
        >
          <CalendarRange className="h-4 w-4" />
          Planifier la semaine
        </Button>
      </div>

      <PlanningFilterBar stores={stores} selectedStoreId={selectedStoreId} />

      {!selectedStoreId ? (
        <Card className="py-10 text-center text-muted">
          Sélectionnez un magasin pour gérer le planning de ses caissiers.
        </Card>
      ) : planningCashiers.length === 0 ? (
        <Card className="py-10 text-center text-muted">
          Aucun caissier affecté à {selectedStore?.name}. Ajoutez des caissiers dans Utilisateurs
          ou transférez-en depuis un autre magasin.
        </Card>
      ) : (
        <>
          {cashiersWithoutOff.length > 0 && (
            <p className="text-sm text-warning">
              {cashiersWithoutOff.length} caissier(s) sans jour de repos cette semaine
            </p>
          )}

          <Card padding={false} className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-primary-light/40">
                  <th className="sticky left-0 z-10 bg-primary-light/95 px-4 py-3 text-left font-medium text-muted">
                    Caissier
                  </th>
                  <th className="px-3 py-3 text-left font-medium text-muted">Repos</th>
                  {weekDays.map((day) => (
                    <th key={day} className="min-w-[7rem] px-2 py-3 text-center font-medium text-muted">
                      {formatShiftDate(day)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {planningCashiers.map((cashier) => {
                  const isBorrowed = cashier.store_id !== selectedStoreId;
                  return (
                    <tr key={cashier.id} className="border-b border-border last:border-b-0">
                      <td className="sticky left-0 z-10 bg-surface px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{cashier.full_name || cashier.email}</p>
                            {isBorrowed && (
                              <p className="text-[10px] text-warning">Prêté · {cashier.store_name}</p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="shrink-0"
                            title="Transférer vers un autre magasin"
                            onClick={() => setTransferCashier(cashier)}
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <SelectMenu
                          value={weekOffByCashier.get(cashier.id) || ""}
                          onChange={(value) => handleWeekOffChange(cashier.id, value)}
                          options={dayOffOptions}
                          defaultIcon={CalendarOff}
                          disabled={pending}
                          size="sm"
                        />
                      </td>
                      {weekDays.map((day) => {
                        const shift = shiftByCashierDay.get(`${cashier.id}:${day}`);
                        const isOff = weekOffByCashier.get(cashier.id) === day;
                        const scheduledElsewhere = allShifts.find(
                          (s) => s.cashier_id === cashier.id && s.shift_date === day && s.store_id !== selectedStoreId
                        );

                        if (isOff) {
                          return (
                            <td key={day} className="px-2 py-2 text-center">
                              <Badge variant="default">Repos</Badge>
                            </td>
                          );
                        }

                        if (scheduledElsewhere) {
                          return (
                            <td key={day} className="px-2 py-2 text-center text-xs text-muted">
                              Autre magasin
                            </td>
                          );
                        }

                        if (shift) {
                          return (
                            <td key={day} className="px-2 py-2">
                              <div className="rounded-lg border border-primary/30 bg-primary/5 px-2 py-1.5 text-center">
                                <p className="text-xs font-medium text-primary">
                                  {formatTimeLabel(shift.start_time)} – {formatTimeLabel(shift.end_time)}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(shift.id)}
                                  className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-danger hover:underline cursor-pointer"
                                  disabled={pending}
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Retirer
                                </button>
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td key={day} className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => openAddModal(cashier.id, day)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-border text-muted hover:border-primary hover:text-primary cursor-pointer"
                              title="Ajouter un créneau"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {weekOffError && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{weekOffError}</p>
      )}
      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      {modalOpen && selectedStoreId && (
        <Modal onClose={() => setModalOpen(false)} size="md">
          <h3 className="text-lg font-semibold">Nouveau créneau</h3>
          <p className="mt-1 text-sm text-muted">
            {selectedStore?.name} · {formatShiftDate(shiftDate)}
          </p>

          <form onSubmit={handleCreate} className="mt-5 space-y-4">
            {cashierOptions.length === 0 ? (
              <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
                Aucun caissier disponible ce jour (déjà planifié ou en repos).
              </p>
            ) : (
              <SelectMenu
                label="Caissier"
                value={cashierId}
                onChange={setCashierId}
                options={cashierOptions}
                searchable={cashierOptions.length > 6}
              />
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

            <Input
              label="Note (optionnel)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full"
            />

            {error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                loading={pending}
                disabled={cashierOptions.length === 0 || !cashierId}
              >
                <CalendarPlus className="h-4 w-4" />
                Enregistrer
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {weekPlanOpen && selectedStoreId && selectedStore && (
        <WeekPlanModal
          storeId={selectedStoreId}
          storeName={selectedStore.name}
          weekStart={weekStart}
          cashierCount={planningCashiers.length}
          onClose={() => setWeekPlanOpen(false)}
        />
      )}

      {transferCashier && selectedStoreId && (
        <CashierTransferModal
          cashier={transferCashier}
          stores={stores}
          currentStoreId={selectedStoreId}
          onClose={() => setTransferCashier(null)}
        />
      )}
    </div>
  );
}
