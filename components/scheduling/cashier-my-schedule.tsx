"use client";

import { useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CalendarOff, ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  addWeeks,
  formatShiftDate,
  formatTimeLabel,
  formatWeekRangeLabel,
  getWeekDays,
} from "@/lib/scheduling/week";
import type { CashierShift } from "@/lib/scheduling/shifts";

type Props = {
  shifts: CashierShift[];
  weekStart: string;
  offDate: string | null;
};

export function CashierMySchedule({ shifts, weekStart, offDate }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const shiftByDay = useMemo(() => {
    const map = new Map<string, CashierShift>();
    for (const shift of shifts) {
      map.set(shift.shift_date, shift);
    }
    return map;
  }, [shifts]);

  function pushWeek(nextWeek: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("week", nextWeek);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => pushWeek(addWeeks(weekStart, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="min-w-[14rem] text-center text-sm font-semibold text-foreground">
          Semaine du {formatWeekRangeLabel(weekStart)}
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={() => pushWeek(addWeeks(weekStart, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {weekDays.map((day) => {
          const shift = shiftByDay.get(day);
          const isOff = offDate === day;

          return (
            <Card
              key={day}
              className={isOff ? "border-border bg-page/60" : shift ? "border-primary/30 bg-champagne/15" : ""}
            >
              <p className="text-sm font-semibold text-foreground">{formatShiftDate(day)}</p>

              {isOff ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-muted">
                  <CalendarOff className="h-4 w-4 shrink-0" />
                  Jour de repos
                </div>
              ) : shift ? (
                <div className="mt-3 space-y-2">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
                    <Clock className="h-4 w-4 shrink-0" />
                    {formatTimeLabel(shift.start_time)} – {formatTimeLabel(shift.end_time)}
                  </p>
                  <p className="flex items-center gap-1.5 text-sm text-muted">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                    {shift.stores?.name || "Magasin"}
                  </p>
                  {shift.notes && (
                    <p className="text-xs text-muted">{shift.notes}</p>
                  )}
                  <Badge variant="success">Planifié</Badge>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted">Pas de créneau</p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
