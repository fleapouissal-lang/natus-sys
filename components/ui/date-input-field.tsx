"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { cn, toLocalDateKey } from "@/lib/utils";

const WEEKDAYS = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

function formatDisplayDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("fr-FR");
}

function getMonthDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startPad = (first.getDay() + 6) % 7;
  const days: (Date | null)[] = Array.from({ length: startPad }, () => null);
  for (let d = 1; d <= lastDay; d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

function MonthCalendar({
  value,
  onSelect,
  onClose,
  style,
  minDate,
  maxDate,
}: {
  value: string;
  onSelect: (iso: string) => void;
  onClose: () => void;
  style?: React.CSSProperties;
  minDate?: string;
  maxDate?: string;
}) {
  const initial = value ? new Date(`${value}T12:00:00`) : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const days = getMonthDays(viewYear, viewMonth);
  const todayKey = toLocalDateKey(new Date());
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  return (
    <div
      ref={panelRef}
      className="month-calendar-panel w-[280px] border border-primary/50 bg-surface shadow-xl"
      style={style}
    >
      <div className="flex items-center justify-between border-b border-primary/20 bg-primary/10 px-3 py-2">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1 text-primary hover:bg-primary/15 cursor-pointer"
          aria-label="Mois précédent"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="font-heading text-sm font-semibold capitalize text-foreground">
          {monthLabel}
        </p>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1 text-primary hover:bg-primary/15 cursor-pointer"
          aria-label="Mois suivant"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-border bg-background/80">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-border p-2">
        {days.map((day, i) => {
          if (!day) {
            return <div key={`empty-${i}`} className="aspect-square bg-surface" />;
          }
          const key = toLocalDateKey(day);
          const isSelected = value === key;
          const isToday = key === todayKey;
          const isDisabled =
            (minDate && key < minDate) || (maxDate && key > maxDate) || false;

          return (
            <button
              key={key}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelect(key)}
              className={cn(
                "aspect-square bg-surface text-sm font-medium transition-colors",
                isDisabled
                  ? "cursor-not-allowed text-muted/40"
                  : "cursor-pointer",
                isSelected && "bg-champagne text-black font-bold",
                !isSelected && isToday && "ring-1 ring-inset ring-primary text-primary",
                !isSelected && !isToday && !isDisabled && "hover:bg-primary/10"
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DateInputField({
  label,
  value,
  onChange,
  minDate,
  maxDate,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  minDate?: string;
  maxDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => setMounted(true), []);

  function updatePosition() {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const calendarHeight = 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < calendarHeight && rect.top > calendarHeight;

    setPosition({
      top: openUp ? rect.top - calendarHeight - 4 : rect.bottom + 4,
      left: Math.min(rect.left, window.innerWidth - 288),
    });
  }

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  function setOpenState(next: boolean) {
    setOpen(next);
    if (next) updatePosition();
  }

  return (
    <div className="relative">
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <div ref={anchorRef} className="relative">
        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
        <input
          type="text"
          readOnly
          value={formatDisplayDate(value)}
          placeholder="jj/mm/aaaa"
          onClick={() => setOpenState(!open)}
          className="natus-field w-full cursor-pointer bg-surface py-0 pl-10 pr-8 text-sm"
        />
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              setOpenState(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-foreground cursor-pointer"
            aria-label="Effacer la date"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {mounted && open && position &&
        createPortal(
          <MonthCalendar
            value={value}
            onSelect={(iso) => {
              onChange(iso);
              setOpenState(false);
            }}
            onClose={() => setOpenState(false)}
            minDate={minDate}
            maxDate={maxDate}
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              zIndex: 9999,
            }}
          />,
          document.body
        )}
    </div>
  );
}
