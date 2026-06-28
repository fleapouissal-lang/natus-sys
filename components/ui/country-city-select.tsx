"use client";

import { useMemo } from "react";
import { Country, City } from "country-state-city";
import { Globe, MapPin } from "lucide-react";
import { SelectMenu, type SelectMenuOption } from "@/components/ui/select-menu";
import { cn } from "@/lib/utils";

/** Nom du pays (lisible) à partir de son code ISO. */
export function countryNameFromCode(isoCode: string): string {
  if (!isoCode) return "";
  return Country.getCountryByCode(isoCode)?.name ?? isoCode;
}

/**
 * Couple de listes déroulantes Pays → Ville, avec recherche intégrée.
 * Le champ Pays charge tous les pays du monde ; le champ Ville se remplit
 * automatiquement selon le pays sélectionné.
 */
export function CountryCitySelect({
  countryCode,
  city,
  onCountryChange,
  onCityChange,
  countryLabel = "Pays",
  cityLabel = "Ville",
  required = false,
  disabled = false,
  className,
}: {
  countryCode: string;
  city: string;
  onCountryChange: (isoCode: string) => void;
  onCityChange: (city: string) => void;
  countryLabel?: string;
  cityLabel?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const countryOptions = useMemo<SelectMenuOption[]>(
    () =>
      Country.getAllCountries().map((country) => ({
        value: country.isoCode,
        label: `${country.flag} ${country.name}`,
      })),
    []
  );

  const cityOptions = useMemo<SelectMenuOption[]>(() => {
    if (!countryCode) return [];
    const cities = City.getCitiesOfCountry(countryCode) ?? [];
    const seen = new Set<string>();
    const options: SelectMenuOption[] = [];
    for (const item of cities) {
      if (seen.has(item.name)) continue;
      seen.add(item.name);
      options.push({ value: item.name, label: item.name });
    }
    return options.sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [countryCode]);

  return (
    <div className={cn("space-y-4", className)}>
      <SelectMenu
        label={countryLabel}
        required={required}
        disabled={disabled}
        value={countryCode}
        onChange={(iso) => {
          onCountryChange(iso);
          onCityChange("");
        }}
        options={countryOptions}
        searchable
        searchPlaceholder="Rechercher un pays..."
        placeholder="Sélectionner un pays"
        emptySearchLabel="Aucun pays trouvé"
        defaultIcon={Globe}
      />
      <SelectMenu
        label={cityLabel}
        required={required}
        disabled={disabled || !countryCode}
        value={city}
        onChange={onCityChange}
        options={cityOptions}
        searchable
        searchPlaceholder="Rechercher une ville..."
        placeholder={countryCode ? "Sélectionner une ville" : "Choisissez d'abord un pays"}
        emptySearchLabel={
          countryCode ? "Aucune ville trouvée pour ce pays" : "Choisissez d'abord un pays"
        }
        defaultIcon={MapPin}
      />
    </div>
  );
}
