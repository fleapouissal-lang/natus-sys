"use client";

import { useCallback, useEffect, useRef } from "react";

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
}

export function useBarcodeScanner({ onScan, enabled = true }: UseBarcodeScannerOptions) {
  const inputRef = useRef<HTMLInputElement>(null);
  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);

  const focusInput = useCallback(() => {
    if (enabled && inputRef.current && document.activeElement !== inputRef.current) {
      const tag = document.activeElement?.tagName;
      const isTyping =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      if (!isTyping || document.activeElement === inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    focusInput();
    const interval = setInterval(focusInput, 2000);
    const onClick = () => setTimeout(focusInput, 100);
    window.addEventListener("click", onClick);

    return () => {
      clearInterval(interval);
      window.removeEventListener("click", onClick);
    };
  }, [enabled, focusInput]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const now = Date.now();
    const isScanner = now - lastKeyTimeRef.current < 50;
    lastKeyTimeRef.current = now;

    if (e.key === "Enter") {
      e.preventDefault();
      const inputValue = (e.target as HTMLInputElement).value.trim();
      const code = inputValue || bufferRef.current.trim();
      if (code) {
        onScan(code);
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
  }

  return { inputRef, handleKeyDown, handleChange, focusInput };
}
