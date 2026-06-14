import { cn } from "@/lib/utils";

const selectClassName =
  "w-full border border-border bg-surface px-3 py-2 text-sm transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  placeholder?: string;
  options: readonly string[];
}

export function Select({
  label,
  error,
  placeholder = "Sélectionner...",
  options,
  className,
  id,
  ...props
}: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          selectClassName,
          error && "border-danger focus:border-danger focus:ring-danger/20",
          className
        )}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export { selectClassName };
