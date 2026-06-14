"use client";

import { useState } from "react";
import {
  SelectMenu,
  optionsFromStrings,
  type SelectMenuProps,
} from "@/components/ui/select-menu";

interface SelectProps
  extends Omit<SelectMenuProps, "options" | "value" | "onChange"> {
  options: readonly string[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}

export function Select({
  options,
  placeholder = "Sélectionner...",
  value,
  defaultValue = "",
  onChange,
  ...props
}: SelectProps) {
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;

  return (
    <SelectMenu
      {...props}
      placeholder={placeholder}
      value={current}
      onChange={(next) => {
        setInternal(next);
        onChange?.(next);
      }}
      options={optionsFromStrings(options)}
    />
  );
}

export { SelectMenu, optionsFromStrings, optionsFromEntries } from "@/components/ui/select-menu";
export type { SelectMenuOption, SelectMenuProps } from "@/components/ui/select-menu";
