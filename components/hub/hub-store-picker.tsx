"use client";

import { useEffect, useMemo, useState } from "react";
import { StoreMultiSelect } from "@/components/hub/store-multi-select";
import { SelectMenu } from "@/components/ui/select-menu";
import { cityOptions } from "@/lib/select-options";
import { NATUS_CITIES } from "@/lib/constants/cities";
import type { Store } from "@/lib/types";

function retailStoresForCity(stores: Store[], city: string) {
  return stores.filter((store) => store.city === city && !store.is_hub);
}

export function HubStorePicker({
  hubCity,
  retailStores,
  value,
  onChange,
  autoSelectCityStores = false,
}: {
  hubCity: string;
  retailStores: Store[];
  value: string[];
  onChange: (next: string[]) => void;
  autoSelectCityStores?: boolean;
}) {
  const storeMap = useMemo(
    () => Object.fromEntries(retailStores.map((store) => [store.id, store])),
    [retailStores]
  );

  const cityStores = useMemo(
    () => (hubCity ? retailStoresForCity(retailStores, hubCity) : []),
    [hubCity, retailStores]
  );

  const crossCityIds = useMemo(
    () => value.filter((id) => storeMap[id] && storeMap[id].city !== hubCity),
    [value, storeMap, hubCity]
  );

  const otherCities = useMemo(
    () => NATUS_CITIES.filter((city) => city !== hubCity),
    [hubCity]
  );

  const [includeOtherCities, setIncludeOtherCities] = useState(crossCityIds.length > 0);
  const [otherCity, setOtherCity] = useState(() => {
    const firstCross = crossCityIds[0];
    return firstCross ? storeMap[firstCross]?.city || otherCities[0] || "" : otherCities[0] || "";
  });

  const cityStoreIds = useMemo(
    () => value.filter((id) => storeMap[id]?.city === hubCity),
    [value, storeMap, hubCity]
  );

  const otherCityStores = useMemo(
    () => (otherCity ? retailStoresForCity(retailStores, otherCity) : []),
    [otherCity, retailStores]
  );

  const otherCitySelectedIds = useMemo(
    () => value.filter((id) => storeMap[id]?.city === otherCity),
    [value, storeMap, otherCity]
  );

  useEffect(() => {
    if (crossCityIds.length > 0) setIncludeOtherCities(true);
  }, [crossCityIds.length]);

  useEffect(() => {
    if (!autoSelectCityStores || !hubCity || cityStores.length === 0) return;
    const cityIds = cityStores.map((store) => store.id);
    const crossIds = value.filter((id) => storeMap[id] && storeMap[id].city !== hubCity);
    onChange([...cityIds, ...crossIds]);
    // Resync city defaults when the depot city changes (create form).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubCity, autoSelectCityStores, cityStores]);

  function updateCityStores(nextCityIds: string[]) {
    const crossIds = value.filter((id) => storeMap[id]?.city !== hubCity);
    onChange([...nextCityIds, ...crossIds]);
  }

  function updateOtherCityStores(nextOtherIds: string[]) {
    const sameCityIds = value.filter((id) => storeMap[id]?.city === hubCity);
    const otherCrossIds = value.filter(
      (id) => storeMap[id]?.city !== hubCity && storeMap[id]?.city !== otherCity
    );
    onChange([...sameCityIds, ...otherCrossIds, ...nextOtherIds]);
  }

  function disableOtherCities() {
    setIncludeOtherCities(false);
    onChange(cityStoreIds);
  }

  return (
    <div className="space-y-4">
      <StoreMultiSelect
        label={hubCity ? `Magasins — ${hubCity}` : "Magasins rattachés"}
        stores={cityStores}
        value={cityStoreIds}
        onChange={updateCityStores}
        required
        showCity={false}
        emptyMessage={
          hubCity
            ? `Aucun magasin retail à ${hubCity}.`
            : "Sélectionnez d'abord la ville du dépôt."
        }
      />

      <div className="rounded-lg border border-border p-3">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={includeOtherCities}
            onChange={(e) => {
              if (e.target.checked) {
                setIncludeOtherCities(true);
                if (!otherCity && otherCities[0]) setOtherCity(otherCities[0]);
              } else {
                disableOtherCities();
              }
            }}
            className="mt-0.5 h-4 w-4 accent-primary"
          />
          <span>
            <span className="block text-sm font-medium text-foreground">
              Rattacher des magasins d&apos;autres villes
            </span>
            <span className="mt-0.5 block text-xs text-muted">
              Par défaut, seuls les magasins de la ville du dépôt sont proposés.
            </span>
          </span>
        </label>

        {includeOtherCities && (
          <div className="mt-4 space-y-4 border-t border-border pt-4">
            <SelectMenu
              label="Autre ville"
              value={otherCity}
              onChange={setOtherCity}
              options={cityOptions(otherCities, { includeAll: false })}
              required
            />
            <StoreMultiSelect
              label={otherCity ? `Magasins — ${otherCity}` : "Magasins"}
              stores={otherCityStores}
              value={otherCitySelectedIds}
              onChange={updateOtherCityStores}
              showCity={false}
              emptyMessage={
                otherCity
                  ? `Aucun magasin retail à ${otherCity}.`
                  : "Choisissez une ville."
              }
            />
            {crossCityIds.length > 0 && (
              <p className="text-xs text-muted">
                {crossCityIds.length} magasin{crossCityIds.length !== 1 ? "s" : ""} hors ville
                {otherCity && crossCityIds.some((id) => storeMap[id]?.city !== otherCity)
                  ? " (plusieurs villes possibles)"
                  : ""}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
