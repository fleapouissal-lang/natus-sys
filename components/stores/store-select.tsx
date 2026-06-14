import type { Store } from "@/lib/types";

export function StoreSelect({
  stores,
  value,
  onChange,
  name = "store_id",
  label = "Magasin",
  required = true,
  className = "",
}: {
  stores: Store[];
  value?: string;
  onChange?: (storeId: string) => void;
  name?: string;
  label?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <select
        name={name}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="w-full border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
        required={required}
      >
        <option value="">Sélectionner un magasin</option>
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name} — {store.city}
          </option>
        ))}
      </select>
    </div>
  );
}
