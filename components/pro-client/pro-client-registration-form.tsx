"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BriefcaseBusiness, CheckCircle2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CountryCitySelect, countryNameFromCode } from "@/components/ui/country-city-select";
import { submitProClientRegistration } from "@/lib/pro-client/actions";
import { loyaltyCardPublicUrl } from "@/lib/loyalty/qr";
import type { ProClientType } from "@/lib/pro-client/types";
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
        description: "Entreprise, responsable, ICE, RC, email et adresse",
        icon: BriefcaseBusiness,
      },
      {
        type: "particulier",
        label: "Particulier",
        description: "Nom complet, téléphone, email et adresse",
        icon: UserRound,
      },
    ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map(({ type, label, description, icon: Icon }) => {
        const active = selected === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onSelect(type)}
            className={cn(
              "rounded-2xl border px-4 py-4 text-left transition-colors",
              active
                ? "border-primary bg-primary/10 shadow-sm"
                : "border-border bg-surface hover:border-primary/40"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-primary"
                style={{ backgroundColor: "#FAEAA1" }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">{label}</p>
                <p className="mt-1 text-xs text-muted">{description}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function ProClientRegistrationForm({
  storeToken,
  storeName,
}: {
  storeToken: string;
  storeName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
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
  const [lastSuccess, setLastSuccess] = useState<{
    qrToken: string;
    cardNumber: string;
  } | null>(null);

  function clearFields() {
    setClientType(null);
    setFullName("");
    setCompanyName("");
    setResponsibleName("");
    setCompanyIce("");
    setCompanyRc("");
    setCountryCode("MA");
    setCity("");
    setAddress("");
    setPhone("");
    setEmail("");
    setError("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientType) {
      setError("Choisissez professionnel ou particulier.");
      return;
    }

    setError("");
    setLastSuccess(null);

    startTransition(async () => {
      const result = await submitProClientRegistration({
        storeToken,
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

      if (result.status !== "success") {
        setError("Inscription impossible. Vérifiez vos informations.");
        return;
      }

      setLastSuccess({
        qrToken: result.qrToken,
        cardNumber: result.cardNumber,
      });
      clearFields();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  return (
    <div className="space-y-4">
      {lastSuccess && (
        <div className="rounded-2xl border border-success/30 bg-success/5 px-4 py-4 text-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            <div className="space-y-2 text-left">
              <p className="font-medium text-foreground">
                Compte Client Pro créé · carte {lastSuccess.cardNumber}
              </p>
              <p className="text-muted">
                En attente d&apos;activation par le directeur. Vous pouvez inscrire un autre client
                ci-dessous.
              </p>
              <Link
                href={loyaltyCardPublicUrl(lastSuccess.qrToken)}
                className="inline-flex text-sm font-medium text-primary hover:underline"
              >
                Voir mon espace client
              </Link>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-2xl border border-primary/15 bg-champagne/20 px-4 py-3 text-sm">
          <p className="text-muted">
            Inscription normale · <span className="font-medium text-foreground">{storeName}</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            Lien permanent · plusieurs comptes possibles depuis cette page
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Type de compte</p>
          <TypeChoice selected={clientType} onSelect={setClientType} />
        </div>

        {clientType === "entreprise" && (
          <div className="space-y-4 rounded-2xl border border-border bg-page/50 p-4">
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
            <Input
              label="ICE"
              value={companyIce}
              onChange={(e) => setCompanyIce(e.target.value)}
              required
            />
            <Input
              label="RC"
              value={companyRc}
              onChange={(e) => setCompanyRc(e.target.value)}
              required
            />
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
            <AddressField
              label="Adresse"
              value={address}
              onChange={setAddress}
              required
            />
          </div>
        )}

        {clientType === "particulier" && (
          <div className="space-y-4 rounded-2xl border border-border bg-page/50 p-4">
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
            <AddressField
              label="Adresse"
              value={address}
              onChange={setAddress}
            />
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}

        <Button type="submit" loading={pending} disabled={!clientType} className="w-full">
          Créer un compte Client Pro
        </Button>
      </form>
    </div>
  );
}
