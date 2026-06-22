"use client";

import { useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  addWeeks,
  formatTimeLabel,
  formatWeekRangeLabel,
  getDayNumber,
  getShortDayLabel,
  getWeekDays,
  isToday,
  toDateInputValue,
} from "@/lib/scheduling/week";
import type { CashierShift } from "@/lib/scheduling/shifts";
import { cn } from "@/lib/utils";

type Props = {
  shifts: CashierShift[];
  weekStart: string;
  offDate: string | null;
};

function shiftDurationHours(start: string, end: string): number {
  const [sh, sm] = start.slice(0, 5).split(":").map(Number);
  const [eh, em] = end.slice(0, 5).split(":").map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}

export function CashierMyScheduleMobile({ shifts, weekStart, offDate }: Props) {
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

  const stats = useMemo(() => {
    let shiftCount = 0;
    let totalHours = 0;
    for (const day of weekDays) {
      const shift = shiftByDay.get(day);
      if (shift) {
        shiftCount += 1;
        totalHours += shiftDurationHours(shift.start_time, shift.end_time);
      }
    }
    const hasOff = Boolean(offDate);
    return { shiftCount, totalHours, hasOff };
  }, [weekDays, shiftByDay, offDate]);

  const todayStr = toDateInputValue(new Date());
  const todayShift = weekDays.includes(todayStr) ? shiftByDay.get(todayStr) : undefined;

  function pushWeek(nextWeek: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("week", nextWeek);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary/20 bg-surface p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-9 w-9 shrink-0 p-0"
            onClick={() => pushWeek(addWeeks(weekStart, -1))}
            aria-label="Semaine précédente"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="min-w-0 flex-1 text-center text-sm font-semibold leading-snug text-foreground">
            {formatWeekRangeLabel(weekStart)}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-9 w-9 shrink-0 p-0"
            onClick={() => pushWeek(addWeeks(weekStart, 1))}
            aria-label="Semaine suivante"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-medium">
          <span className="rounded-full bg-black/5 px-3 py-1 text-foreground">
            {stats.shiftCount} créneau{stats.shiftCount !== 1 ? "x" : ""}
          </span>
          {stats.totalHours > 0 && (
            <span className="rounded-full bg-primary/15 px-3 py-1 text-primary-dark">
              {stats.totalHours % 1 === 0
                ? `${stats.totalHours}h`
                : `${stats.totalHours.toFixed(1)}h`}
            </span>
          )}
          {stats.hasOff && (
            <span className="rounded-full bg-black/5 px-3 py-1 text-muted">
              1 repos
            </span>
          )}
        </div>
      </div>

      {todayShift && (
        <div className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Aujourd&apos;hui
            </p>
            <p className="mt-0.5 text-sm font-medium text-foreground">
              {formatTimeLabel(todayShift.start_time)} –{" "}
              {formatTimeLabel(todayShift.end_time)}
            </p>
            <p className="text-xs text-muted">
              {todayShift.stores?.name || "Magasin"}
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between gap-1 px-0.5">
        {weekDays.map((day) => {
          const shift = shiftByDay.get(day);
          const isOff = offDate === day;
          const today = isToday(day);

          return (
            <div
              key={day}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-2",
                today && "bg-primary/10 ring-1 ring-primary/30"
              )}
            >
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wide",
                  today ? "text-primary" : "text-muted"
                )}
              >
                {getShortDayLabel(day)}
              </span>
              <span
                className={cn(
                  "text-sm font-bold tabular-nums",
                  today ? "text-primary" : "text-foreground"
                )}
              >
                {getDayNumber(day)}
              </span>
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isOff && "bg-muted/50",
                  shift && "bg-primary",
                  !isOff && !shift && "bg-black/10"
                )}
                aria-hidden
              />
            </div>
          );
        })}
      </div>

      <ol className="relative m-0 list-none space-y-0 p-0 pb-2">
        {weekDays.map((day, index) => {
          const shift = shiftByDay.get(day);
          const isOff = offDate === day;
          const today = isToday(day);
          const isLast = index === weekDays.length - 1;

          return (
            <li key={day} className="relative flex gap-3 pb-4">
              {!isLast && (
                <span
                  className="absolute left-[1.125rem] top-10 bottom-0 w-px bg-black/10"
                  aria-hidden
                />
              )}

              <div
                className={cn(
                  "relative z-10 flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-full text-[10px] font-bold leading-none",
                  isOff && "bg-black/5 text-muted",
                  shift && "bg-primary text-white",
                  !isOff && !shift && "border border-dashed border-black/20 bg-surface text-muted",
                  today && !shift && "ring-2 ring-primary/40"
                )}
              >
                {getDayNumber(day)}
              </div>

              <div
                className={cn(
                  "min-w-0 flex-1 rounded-2xl border px-3.5 py-3",
                  today && shift && "border-primary/35 bg-champagne/25",
                  today && isOff && "border-black/10 bg-page/80",
                  today && !shift && !isOff && "border-black/10 bg-surface",
                  !today && shift && "border-primary/20 bg-surface",
                  !today && isOff && "border-black/8 bg-page/60",
                  !today && !shift && !isOff && "border-black/8 bg-surface/80"
                )}
              >
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {getShortDayLabel(day)}
                  </p>
                  {today && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                      Aujourd&apos;hui
                    </span>
                  )}
                </div>

                {isOff ? (
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted">
                    <CalendarOff className="h-4 w-4 shrink-0" />
                    Jour de repos
                  </div>
                ) : shift ? (
                  <div className="mt-2 space-y-1.5">
                    <p className="flex items-center gap-1.5 text-base font-semibold text-primary">
                      <Clock className="h-4 w-4 shrink-0" />
                      {formatTimeLabel(shift.start_time)} –{" "}
                      {formatTimeLabel(shift.end_time)}
                    </p>
                    <p className="flex items-center gap-1.5 text-sm text-muted">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                      {shift.stores?.name || "Magasin"}
                    </p>
                    {shift.notes && (
                      <p className="text-xs text-muted">{shift.notes}</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted">Pas de créneau</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
