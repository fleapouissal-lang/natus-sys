"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Layers, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectMenuOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  description?: string;
}

export interface SelectMenuProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectMenuOption[];
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  size?: "xs" | "sm" | "md";
  name?: string;
  id?: string;
  required?: boolean;
  defaultIcon?: LucideIcon;
  showIcons?: boolean;
}

function OptionIcon({
  icon: Icon,
  active,
  compact = false,
}: {
  icon: LucideIcon;
  active?: boolean;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "select-menu-icon-box flex shrink-0 items-center justify-center",
        compact ? "h-6 w-6" : "h-9 w-9",
        active ? "bg-primary/15 text-primary" : "bg-primary-light text-primary"
      )}
    >
      <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} strokeWidth={2} />
    </span>
  );
}

export function SelectMenu({
  value,
  onChange,
  options,
  placeholder = "Sélectionner...",
  label,
  error,
  disabled = false,
  className,
  triggerClassName,
  size = "md",
  name,
  id,
  required,
  defaultIcon: DefaultIcon = Layers,
  showIcons = true,
}: SelectMenuProps) {
  const autoId = useId();
  const controlId = id || name || autoId;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [panelStyle, setPanelStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const selected = options.find((o) => o.value === value);
  const SelectedIcon = selected?.icon || DefaultIcon;
  const compact = size === "xs" || size === "sm";

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const gap = 6;
    const maxHeight = 280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < maxHeight && rect.top > spaceBelow;

    setPanelStyle({
      left: rect.left,
      width: rect.width,
      top: openUp ? rect.top - gap : rect.bottom + gap,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function onEscape(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value);
      setHighlight(idx >= 0 ? idx : 0);
    }
  }, [open, options, value]);

  function selectOption(option: SelectMenuOption) {
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen((v) => !v);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlight((i) => Math.min(i + 1, options.length - 1));
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlight((i) => Math.max(i - 1, 0));
    }

    if (e.key === "Enter" && open && highlight >= 0) {
      e.preventDefault();
      selectOption(options[highlight]);
    }
  }

  const panel =
    open && panelStyle
      ? createPortal(
          <div
            ref={panelRef}
            className="select-menu-panel fixed z-[100] overflow-hidden border border-primary bg-surface shadow-[0_12px_40px_rgba(0,0,0,0.12),0_0_0_1px_rgba(179,140,74,0.12)]"
            style={{
              left: panelStyle.left,
              top: panelStyle.top,
              width: panelStyle.width,
              transform:
                panelStyle.top < (triggerRef.current?.getBoundingClientRect().top ?? 0)
                  ? "translateY(-100%)"
                  : undefined,
            }}
            role="listbox"
            id={`${controlId}-listbox`}
          >
            <ul className="select-menu-scroll max-h-[280px] overflow-y-auto p-2">
              {options.map((option, index) => {
                const Icon = option.icon || DefaultIcon;
                const active = option.value === value;
                const highlighted = index === highlight;

                return (
                  <li key={option.value || "__empty"} role="option" aria-selected={active}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlight(index)}
                      onClick={() => selectOption(option)}
                      className={cn(
                        "flex w-full items-center text-left transition-colors cursor-pointer",
                        showIcons ? "gap-3 px-2 py-2.5 text-sm" : "px-2.5 py-1.5 text-xs",
                        (active || highlighted) && "bg-primary-light text-foreground",
                        !active && !highlighted && "hover:bg-primary-light/70"
                      )}
                    >
                      {showIcons && (
                        <OptionIcon icon={Icon} active={active} compact={compact} />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium leading-tight">
                          {option.label}
                        </span>
                        {option.description && (
                          <span className="mt-0.5 block text-xs text-muted">
                            {option.description}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body
        )
      : null;

  return (
    <div className={cn("select-menu flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={controlId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      {name && (
        <input type="hidden" name={name} value={value} required={required} />
      )}

      <button
        ref={triggerRef}
        id={controlId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${controlId}-listbox`}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          "select-menu-trigger natus-field flex w-full items-center bg-surface text-left transition-all",
          "hover:border-primary focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !showIcons && size === "xs" && "h-8 gap-1.5 px-2 text-xs",
          showIcons && size === "xs" && "h-8 gap-1.5 px-2 text-xs",
          size === "sm" && "h-8 gap-1.5 px-2 text-sm",
          size === "md" && "gap-3 px-3 py-2.5 text-sm",
          open && "ring-2 ring-primary/15",
          error && "border-danger focus:border-danger focus:ring-danger/15",
          triggerClassName
        )}
      >
        {showIcons && (
          <OptionIcon icon={SelectedIcon} active={Boolean(selected)} compact={compact} />
        )}
        <span
          className={cn(
            "min-w-0 flex-1 truncate font-medium leading-none",
            !selected && "text-muted"
          )}
        >
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          className={cn(
            "shrink-0 text-primary transition-transform duration-200",
            !showIcons || compact ? "h-3 w-3" : "h-4 w-4",
            open && "rotate-180"
          )}
        />
      </button>

      {error && <p className="text-xs text-danger">{error}</p>}
      {panel}
    </div>
  );
}

export function optionsFromStrings(
  items: readonly string[],
  icon?: LucideIcon
): SelectMenuOption[] {
  return items.map((item) => ({ value: item, label: item, icon }));
}

export function optionsFromEntries(
  entries: readonly { value: string; label: string; icon?: LucideIcon }[]
): SelectMenuOption[] {
  return entries.map((e) => ({ ...e }));
}
