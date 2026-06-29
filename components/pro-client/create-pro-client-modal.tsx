"use client";

import { useState, useTransition } from "react";
import { BriefcaseBusiness, UserRound } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CountryCitySelect, countryNameFromCode } from "@/components/ui/country-city-select";
import { createProClientCustomer } from "@/lib/actions";
import type { ProClientType } from "@/lib/pro-client/types";
import type { Store } from "@/lib/types";
import { cn } from "@/lib/utils";

function AddressField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const inputId = label.toLowerCase().replace(/\s/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
        {!required && <span className="font-normal text-muted"> (optionnel)</span>}
      </label>
      <textarea
        id={inputId}
        rows={3}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="natus-field resize-none bg-surface px-3 py-2 text-sm placeholder:text-muted"
      />
    </div>
  );
}

function TypeChoice({
  selected,
  onSelect,
}: {
  selected: ProClientType | null;
  onSelect: (type: ProClientType) => void;
}) {
  const options: { type: ProClientType; label: string; description: string; icon: typeof UserRound }[] =
    [
      {
        type: "entreprise",
        label: "Professionnel",
        description: "Entreprise, responsable, ICE, RC",
        icon: BriefcaseBusiness,
      },
      {
        type: "particulier",
        label: "Particulier",
        description: "Nom, téléphone, email",
        icon: UserRound,
      },
    ];

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map(({ type, label, description, icon: Icon }) => {
        const active = selected === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onSelect(type)}
            className={cn(
              "rounded-xl border px-3 py-3 text-left transition-colors",
              active
                ? "border-primary bg-primary-light/30"
                : "border-border bg-surface hover:bg-primary-light/15"
            )}
          >
            <div className="flex items-start gap-2">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold">{label}</p>
                <p className="mt-0.5 text-xs text-muted">{description}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function CreateProClientModal({
  stores,
  onClose,
  onCreated,
}: {
  stores: Pick<Store, "id" | "name">[];
  onClose: () => void;
  onCreated: (result: { cardNumber: string; customerId: string }) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [clientType, setClientType] = useState<ProClientType | null>(null);
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [companyIce, setCompanyIce] = useState("");
  const [companyRc, setCompanyRc] = useState("");
  const [countryCode, setCountryCode] = useState("MA");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!storeId) {
      setError("Choisissez un magasin.");
      return;
    }
    if (!clientType) {
      setError("Choisissez professionnel ou particulier.");
      return;
    }

    setError("");
    startTransition(async () => {
      const result = await createProClientCustomer({
        storeId,
        clientType,
        fullName: fullName.trim(),
        companyName: clientType === "entreprise" ? companyName : undefined,
        responsibleName: clientType === "entreprise" ? responsibleName : undefined,
        companyIce: clientType === "entreprise" ? companyIce : undefined,
        companyRc: clientType === "entreprise" ? companyRc : undefined,
        country: clientType === "entreprise" ? countryNameFromCode(countryCode) : undefined,
        city: clientType === "entreprise" ? city : undefined,
        address,
        email: email.trim(),
        phone: clientType === "particulier" ? phone.trim() : undefined,
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }

      onCreated({ cardNumber: result.cardNumber, customerId: result.customerId });
    });
  }

  return (
    <Modal onClose={onClose} size="lg">
      <h3 className="text-lg font-semibold">Nouveau client Pro</h3>
      <p className="mt-1 text-sm text-muted">
        Le compte sera créé en attente d&apos;activation.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {stores.length > 1 ? (
          <div>
            <label className="mb-1.5 block text-sm font-medium">Magasin d&apos;inscription</label>
            <select
              required
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="natus-field w-full bg-surface px-3 py-2 text-sm"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
        ) : stores.length === 1 ? (
          <p className="rounded-xl border border-border bg-page/50 px-3 py-2 text-sm text-muted">
            Magasin : <span className="font-medium text-foreground">{stores[0].name}</span>
          </p>
        ) : (
          <p className="text-sm text-danger">Aucun magasin actif disponible.</p>
        )}

        <div>
          <p className="mb-2 text-sm font-medium">Type de compte</p>
          <TypeChoice selected={clientType} onSelect={setClientType} />
        </div>

        {clientType === "entreprise" && (
          <div className="space-y-3 rounded-xl border border-border bg-page/50 p-4">
            <Input
              label="Nom de l'entreprise"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
            <Input
              label="Nom du responsable"
              value={responsibleName}
              onChange={(e) => setResponsibleName(e.target.value)}
              required
            />
            <Input label="ICE" value={companyIce} onChange={(e) => setCompanyIce(e.target.value)} required />
            <Input label="RC" value={companyRc} onChange={(e) => setCompanyRc(e.target.value)} required />
            <CountryCitySelect
              countryCode={countryCode}
              city={city}
              onCountryChange={setCountryCode}
              onCityChange={setCity}
              required
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <AddressField label="Adresse" value={address} onChange={setAddress} required />
          </div>
        )}

        {clientType === "particulier" && (
          <div className="space-y-3 rounded-xl border border-border bg-page/50 p-4">
            <Input
              label="Nom complet"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              label="Téléphone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <AddressField label="Adresse" value={address} onChange={setAddress} />
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={pending || stores.length === 0 || !clientType}>
            {pending ? "Création…" : "Créer le compte Pro"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
