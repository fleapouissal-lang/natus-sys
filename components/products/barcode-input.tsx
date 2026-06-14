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
}: BarcodeInputProps) {
  const bufferRef = useRef("");
  const lastKeyRef = useRef(0);
  const inputId = "barcode-input";

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const now = Date.now();
    const isScanner = now - lastKeyRef.current < 50;
    lastKeyRef.current = now;

    if (e.key === "Enter") {
      e.preventDefault();
      const code = (bufferRef.current || value).trim();
      if (code) {
        onChange(code);
        onScan?.(code);
        bufferRef.current = "";
      }
      return;
    }

    if (isScanner && e.key.length === 1) {
      bufferRef.current += e.key;
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
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
        <ScanBarcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
        <input
          id={inputId}
          name={name}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          required={required}
          autoFocus={autoFocus}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            "w-full border border-border bg-surface py-2 pl-10 pr-3 text-sm font-mono transition-colors",
            "placeholder:font-sans placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
          )}
        />
      </div>
      <p className="text-xs text-muted">Passez le code-barres devant le lecteur pour remplissage auto</p>
    </div>
  );
}
