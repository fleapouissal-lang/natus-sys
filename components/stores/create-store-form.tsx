"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select-menu";
import { Card, CardHeader } from "@/components/ui/card";
import { cityOptions } from "@/lib/select-options";
import { createStore } from "@/lib/actions";
import { NATUS_CITIES } from "@/lib/constants/cities";
import { cn } from "@/lib/utils";

export function CreateStoreForm({
  allowedCities,
  defaultCity,
}: {
  allowedCities: string[];
  defaultCity?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [city, setCity] = useState(defaultCity || allowedCities[0] || "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const result = await createStore(new FormData(e.currentTarget));

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Magasin créé avec succès");
      (e.target as HTMLFormElement).reset();
      setCity(defaultCity || allowedCities[0] || "");
      router.refresh();
      setOpen(false);
    }
    setLoading(false);
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <CardHeader title="Nouveau magasin" description="Ajouter un point de vente" />
        <Button
          type="button"
          variant={open ? "secondary" : "primary"}
          onClick={() => setOpen((v) => !v)}
        >
          <Plus className="h-4 w-4" />
          {open ? "Masquer" : "Ajouter un magasin"}
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          />
        </Button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="space-y-4 border-t border-border pt-4">
          <Input label="Nom du magasin" name="name" required placeholder="Natus ..." />
          <SelectMenu
            name="city"
            label="Ville"
            required
            value={city}
            onChange={setCity}
            options={cityOptions(allowedCities, { includeAll: false })}
          />
          {allowedCities.length === 1 && (
            <p className="-mt-2 text-xs text-muted">
              Magasin limité à votre ville : {allowedCities[0]}
            </p>
          )}
          <Input label="Adresse" name="address" placeholder="Rue, quartier..." />

          {error && <p className="text-sm text-danger">{error}</p>}
          {success && <p className="text-sm text-success">{success}</p>}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={loading}>
              <Plus className="h-4 w-4" />
              Créer le magasin
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

export { NATUS_CITIES };
