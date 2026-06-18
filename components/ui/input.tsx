"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  inputSize?: "sm" | "md" | "lg";
}

const inputSizeClasses = {
  sm: "px-3 py-2 text-sm",
  md: "px-3 py-2 text-sm",
  lg: "px-4 py-3 text-base",
} as const;

const labelSizeClasses = {
  sm: "text-sm",
  md: "text-sm",
  lg: "text-base",
} as const;

export function Input({
  label,
  error,
  className,
  id,
  inputSize = "md",
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className={cn("font-medium text-foreground", labelSizeClasses[inputSize])}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "natus-field bg-surface transition-colors",
          inputSizeClasses[inputSize],
          "placeholder:text-muted",
          error && "border-danger focus:border-danger focus:ring-danger/20",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

interface PasswordInputProps extends Omit<InputProps, "type"> {
  maskWithAsterisk?: boolean;
}

export function PasswordInput({
  label,
  error,
  className,
  id,
  inputSize = "md",
  maskWithAsterisk = false,
  value,
  onChange,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const inputId = id || label?.toLowerCase().replace(/\s/g, "-");
  const isControlled = value !== undefined;
  const textValue = isControlled ? String(value) : undefined;

  function handleMaskedChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!onChange) return;

    const current = textValue ?? "";
    const next = e.target.value;
    if (visible || !maskWithAsterisk) {
      onChange(e);
      return;
    }

    if (next.length > current.length) {
      const added = next.slice(current.length).replace(/\*/g, "");
      e.target.value = current + added;
    } else {
      e.target.value = current.slice(0, next.length);
    }
    onChange(e);
  }

  const displayValue =
    maskWithAsterisk && !visible && textValue !== undefined
      ? "*".repeat(textValue.length)
      : textValue;

  const inputType = maskWithAsterisk ? "text" : visible ? "text" : "password";
  const useMaskedValue = maskWithAsterisk && textValue !== undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className={cn("font-medium text-foreground", labelSizeClasses[inputSize])}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type={inputType}
          {...(useMaskedValue ? { value: displayValue, onChange: handleMaskedChange } : {})}
          className={cn(
            "natus-field w-full bg-surface transition-colors",
            inputSizeClasses[inputSize],
            inputSize === "lg" ? "pr-12" : "pr-10",
            "placeholder:text-muted",
            error && "border-danger focus:border-danger focus:ring-danger/20",
            className
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted transition-colors hover:text-foreground cursor-pointer",
            inputSize === "lg" && "right-3"
          )}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          tabIndex={-1}
        >
          {visible ? (
            <EyeOff className={inputSize === "lg" ? "h-5 w-5" : "h-4 w-4"} />
          ) : (
            <Eye className={inputSize === "lg" ? "h-5 w-5" : "h-4 w-4"} />
          )}
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
