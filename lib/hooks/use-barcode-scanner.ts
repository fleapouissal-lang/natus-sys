"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  charFromScannerKeyCode,
  isScannerKeyBurst,
} from "@/lib/barcode/scanner-key";

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  /** Refocus automatique (caisse). Désactivé sur la page produits. */
  autoRefocus?: boolean;
}

export function useBarcodeScanner({
  onScan,
  enabled = true,
  autoRefocus = true,
}: UseBarcodeScannerOptions) {
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
    if (!enabled || !autoRefocus) return;

    focusInput();
    const interval = setInterval(focusInput, 2000);
    const onClick = () => setTimeout(focusInput, 100);
    window.addEventListener("click", onClick);

    return () => {
      clearInterval(interval);
      window.removeEventListener("click", onClick);
    };
  }, [enabled, autoRefocus, focusInput]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const isScanner = isScannerKeyBurst(lastKeyTimeRef.current);
    lastKeyTimeRef.current = Date.now();

    if (e.key === "Enter") {
      e.preventDefault();
      const inputValue = (e.target as HTMLInputElement).value.trim();
      const code = bufferRef.current.trim() || inputValue;
      if (code) {
        onScan(code);
        if (inputRef.current) inputRef.current.value = "";
        bufferRef.current = "";
      }
      return;
    }

    if (
      isScanner &&
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey
    ) {
      const ch = charFromScannerKeyCode(e);
      if (ch) {
        e.preventDefault();
        bufferRef.current += ch;
        if (inputRef.current) inputRef.current.value = bufferRef.current;
      }
    } else if (!isScanner) {
      bufferRef.current = "";
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    bufferRef.current = e.target.value;
  }

  return { inputRef, handleKeyDown, handleChange, focusInput };
}
