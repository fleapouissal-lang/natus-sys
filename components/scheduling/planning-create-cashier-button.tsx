"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateUserWizard } from "@/components/users/create-user-wizard";
import type { Profile, Store } from "@/lib/types";

export function PlanningCreateCashierButton({
  viewer,
  stores,
  selectedStoreId,
  selectedStoreName,
}: {
  viewer: Profile;
  stores: Store[];
  selectedStoreId: string;
  selectedStoreName?: string;
}) {
  const [open, setOpen] = useState(false);
  const cities = viewer.city ? [viewer.city] : [...new Set(stores.map((store) => store.city))];

  return (
    <>
      <Button
        type="button"
        size="sm"
        disabled={!selectedStoreId}
        onClick={() => setOpen(true)}
        title={
          selectedStoreId
            ? `Créer un compte caissier pour ${selectedStoreName || "ce magasin"}`
            : "Sélectionnez un magasin"
        }
      >
        <UserPlus className="h-4 w-4" />
        Ajouter un caissier
      </Button>

      {open && (
        <CreateUserWizard
          viewer={viewer}
          stores={stores}
          cities={cities}
          onClose={() => setOpen(false)}
          cashierOnly
          defaultStoreId={selectedStoreId}
        />
      )}
    </>
  );
}
