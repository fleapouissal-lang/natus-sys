"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  CalendarOff,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Trash2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { SelectMenu } from "@/components/ui/select-menu";
import { Badge } from "@/components/ui/badge";
import { PlanningFilterBar } from "@/components/scheduling/planning-filter-bar";
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
import {
  isCashierOffOnDate,
  weekOffsForDate,
  type CashierWeekOff,
} from "@/lib/scheduling/week-off-utils";
import {
  findCashierShiftOnDate,
  shiftConflictMessage,
} from "@/lib/scheduling/shift-utils";
import type { CashierShift, CashierWithStore } from "@/lib/scheduling/shifts";
import type { Store } from "@/lib/types";

type Props = {
  stores: Store[];
  allCashiers: CashierWithStore[];
  cashiers: CashierWithStore[];
  shifts: CashierShift[];
  allShifts: CashierShift[];
  weekOffs: CashierWeekOff[];
  weekStart: string;
  selectedStoreId: string;
  selectedCashierId: string;
};

export function CashierScheduleManager({
  stores,
  allCashiers,
  cashiers,
  shifts,
  allShifts,
  weekOffs,
  weekStart,
  selectedStoreId,
  selectedCashierId,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [weekOffError, setWeekOffError] = useState("");

  const [cashierId, setCashierId] = useState(cashiers[0]?.id || "");
  const [storeId, setStoreId] = useState(selectedStoreId || stores[0]?.id || "");
  const [shiftDate, setShiftDate] = useState(weekStart);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("15:00");
  const [notes, setNotes] = useState("");

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const dayOffOptions = useMemo(
    () => [
      { value: "", label: "Choisir le jour de repos", icon: CalendarOff },
      ...weekDays.map((d) => ({
        value: d,
        label: formatShiftDate(d),
        icon: CalendarOff,
      })),
    ],
    [weekDays]
  );

  const shiftsByDay = useMemo(() => {
    const map = new Map<string, CashierShift[]>();
    for (const day of weekDays) map.set(day, []);
    for (const shift of shifts) {
      const list = map.get(shift.shift_date);
      if (list) list.push(shift);
    }
    return map;
  }, [shifts, weekDays]);

  const weekOffByCashier = useMemo(() => {
    const map = new Map<string, string>();
    for (const off of weekOffs) map.set(off.cashier_id, off.off_date);
    return map;
  }, [weekOffs]);

  const cashiersWithoutOff = useMemo(
    () => cashiers.filter((c) => !weekOffByCashier.has(c.id)),
    [cashiers, weekOffByCashier]
  );

  const cashierOptions = useMemo(
    () =>
      cashiers.map((c) => ({
        value: c.id,
        label: c.full_name || c.email,
        description: c.store_name,
        icon: User,
      })),
    [cashiers]
  );

  const storeOptions = useMemo(
    () =>
      stores.map((s) => ({
        value: s.id,
        label: s.name,
        description: s.city,
        icon: MapPin,
      })),
    [stores]
  );

  const selectedCashierOff = isCashierOffOnDate(weekOffs, cashierId, shiftDate);

  const existingShiftOnDate = useMemo(
    () => findCashierShiftOnDate(allShifts, cashierId, shiftDate),
    [allShifts, cashierId, shiftDate]
  );

  const shiftConflict = existingShiftOnDate
    ? shiftConflictMessage(existingShiftOnDate)
    : null;

  function pushQuery(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const q = params.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  }

  function openAddModal(date?: string) {
    setError("");
    setCashierId(cashiers[0]?.id || "");
    setStoreId(selectedStoreId || stores[0]?.id || "");
    setShiftDate(date || weekStart);
    setStartTime("10:00");
    setEndTime("15:00");
    setNotes("");
    setModalOpen(true);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (isCashierOffOnDate(weekOffs, cashierId, shiftDate)) {
      setError("Ce jour est le jour de repos de ce caissier");
      return;
    }
    const existing = findCashierShiftOnDate(allShifts, cashierId, shiftDate);
    if (existing) {
      setError(shiftConflictMessage(existing));
      return;
    }
    startTransition(async () => {
      const result = await createCashierShift({
        storeId,
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
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
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

        <Button type="button" onClick={() => openAddModal()} disabled={cashiers.length === 0}>
          <CalendarPlus className="h-4 w-4" />
          Ajouter un créneau
        </Button>
      </div>

      <PlanningFilterBar
        stores={stores}
        cashiers={allCashiers}
        selectedStoreId={selectedStoreId}
        selectedCashierId={selectedCashierId}
      />

      {cashiers.length > 0 && (
        <Card>
          <CardHeader
            title="Jours de repos"
            description="Un jour de repos obligatoire par caissier et par semaine"
          />
          {cashiersWithoutOff.length > 0 && (
            <p className="mb-4 text-sm text-warning">
              {cashiersWithoutOff.length} caissier(s) sans jour de repos défini cette semaine
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cashiers.map((cashier) => (
              <SelectMenu
                key={cashier.id}
                label={cashier.full_name || cashier.email}
                value={weekOffByCashier.get(cashier.id) || ""}
                onChange={(value) => handleWeekOffChange(cashier.id, value)}
                options={dayOffOptions}
                defaultIcon={CalendarOff}
                disabled={pending}
              />
            ))}
          </div>
          {weekOffError && (
            <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {weekOffError}
            </p>
          )}
        </Card>
      )}

      {allCashiers.length === 0 ? (
        <Card className="py-10 text-center text-muted">
          Aucun caissier actif dans vos magasins. Créez des comptes caissiers dans Utilisateurs.
        </Card>
      ) : cashiers.length === 0 ? (
        <Card className="py-10 text-center text-muted">
          Aucun caissier ne correspond aux filtres sélectionnés.
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {weekDays.map((day) => {
            const dayShifts = shiftsByDay.get(day) || [];
            const dayOffs = weekOffsForDate(weekOffs, day);
            return (
              <Card key={day} padding={false} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-border bg-primary-light/40 px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">{formatShiftDate(day)}</p>
                  <Button type="button" variant="ghost" size="sm" onClick={() => openAddModal(day)}>
                    <CalendarPlus className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {dayOffs.length > 0 && (
                  <div className="border-b border-border bg-page/80 px-4 py-2">
                    <p className="mb-1 text-xs font-medium text-muted">Repos</p>
                    <div className="flex flex-wrap gap-1.5">
                      {dayOffs.map((off) => (
                        <Badge key={off.id} variant="default">
                          <CalendarOff className="mr-1 h-3 w-3" />
                          {off.profiles?.full_name || off.profiles?.email || "Caissier"}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <ul className="divide-y divide-border">
                  {dayShifts.length === 0 ? (
                    <li className="px-4 py-6 text-center text-xs text-muted">Aucun créneau</li>
                  ) : (
                    dayShifts.map((shift) => (
                      <li key={shift.id} className="flex items-start gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {shift.profiles?.full_name || shift.profiles?.email || "Caissier"}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                            <MapPin className="h-3 w-3 shrink-0 text-primary" />
                            {shift.stores?.name || "—"}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-primary">
                            <Clock className="h-3 w-3" />
                            {formatTimeLabel(shift.start_time)} – {formatTimeLabel(shift.end_time)}
                          </p>
                          {shift.notes && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted">{shift.notes}</p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-danger hover:bg-danger/10"
                          disabled={pending}
                          onClick={() => handleDelete(shift.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))
                  )}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)} size="md">
          <h3 className="text-lg font-semibold">Nouveau créneau caissier</h3>
          <p className="mt-1 text-sm text-muted">
            Un seul créneau par caissier et par jour (magasin et horaires).
          </p>

          <form onSubmit={handleCreate} className="mt-5 space-y-4">
            <SelectMenu
              label="Caissier"
              value={cashierId}
              onChange={setCashierId}
              options={cashierOptions}
              defaultIcon={User}
              searchable={cashiers.length > 6}
            />

            <SelectMenu
              label="Magasin"
              value={storeId}
              onChange={setStoreId}
              options={storeOptions}
              defaultIcon={MapPin}
            />

            <Input
              label="Date"
              type="date"
              value={shiftDate}
              onChange={(e) => setShiftDate(e.target.value)}
              required
              className="w-full"
            />

            {selectedCashierOff && (
              <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
                Jour de repos pour ce caissier — choisissez une autre date.
              </p>
            )}

            {shiftConflict && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {shiftConflict}
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

            <Input
              label="Note (optionnel)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex. remplacement, formation…"
              className="w-full"
            />

            {error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" loading={pending} disabled={selectedCashierOff || !!shiftConflict}>
                Enregistrer
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {error && !modalOpen && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}
    </div>
  );
}
