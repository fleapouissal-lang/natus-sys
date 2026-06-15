"use client";

import { useRef } from "react";
import { ScanBarcode } from "lucide-react";
import { cn } from "@/lib/utils";

interface BarcodeInputProps {
  label?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  onScan?: (code: string) => void;
  required?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  disabled?: boolean;
  replaceOnScan?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  scannerKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  scannerChange?: React.ChangeEventHandler<HTMLInputElement>;
  helperText?: string;
}

export function BarcodeInput({
  label = "Code-barres",
  name = "barcode",
  value,
  onChange,
  onScan,
  required,
  autoFocus,
  placeholder = "Scannez ou saisissez le code-barres...",
  disabled = false,
  replaceOnScan = false,
  inputRef: externalRef,
  scannerKeyDown,
  scannerChange,
  helperText,
}: BarcodeInputProps) {
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = externalRef ?? internalRef;
  const bufferRef = useRef("");
  const lastKeyRef = useRef(0);
  const inputId = "barcode-input";

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;

    if (scannerKeyDown) {
      scannerKeyDown(e);
      return;
    }

    const now = Date.now();
    const gap = now - lastKeyRef.current;
    const isContinuation = gap <= 50;
    lastKeyRef.current = now;

    if (e.key === "Enter") {
      e.preventDefault();
      const inputVal = (e.target as HTMLInputElement).value.trim();
      const code = replaceOnScan
        ? inputVal || bufferRef.current.trim()
        : inputVal || (bufferRef.current || value).trim();
      if (code) {
        onChange(code);
        onScan?.(code);
        if (replaceOnScan) {
          requestAnimationFrame(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
          });
        }
      }
      bufferRef.current = "";
      return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (replaceOnScan) {
        if (isContinuation) {
          bufferRef.current += e.key;
          onChange(bufferRef.current);
          e.preventDefault();
        } else {
          bufferRef.current = e.key;
        }
        return;
      }

      if (isContinuation) {
        bufferRef.current += e.key;
      } else {
        bufferRef.current = "";
      }
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (disabled) return;
    scannerChange?.(e);
    bufferRef.current = e.target.value;
    onChange(e.target.value);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        <ScanBarcode
          className={cn(
            "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
            disabled ? "text-muted" : "text-primary"
          )}
        />
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={
            replaceOnScan
              ? (e) => e.currentTarget.select()
              : undefined
          }
          required={required}
          autoFocus={autoFocus && !disabled}
          placeholder={disabled ? undefined : placeholder}
          autoComplete="off"
          readOnly={disabled}
          disabled={disabled}
          className={cn(
            "natus-field w-full bg-surface py-2 pl-10 pr-3 text-sm font-mono transition-colors",
            "placeholder:font-sans placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20",
            disabled && "cursor-not-allowed opacity-70"
          )}
        />
      </div>
      {helperText && <p className="text-xs text-muted">{helperText}</p>}
    </div>
  );
}
