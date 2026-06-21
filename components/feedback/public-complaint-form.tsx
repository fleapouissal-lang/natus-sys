"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Hash, Mail, MapPin, MessageSquare, MessageSquareWarning, Phone, Store, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUploadInput } from "@/components/ui/image-upload-input";
import { SelectMenu } from "@/components/ui/select-menu";
import { cn } from "@/lib/utils";
import { NATUS_WEBSITE_URL } from "@/lib/marketing/public-reviews";
import type {
  PublicComplaintStoresData,
  PublicComplaintType,
} from "@/lib/feedback/public-complaints";

const TYPE_OPTIONS: { value: PublicComplaintType; label: string; description: string }[] = [
  {
    value: "web_service",
    label: "Réclamation de service",
    description: "Accueil, conseil ou expérience en magasin",
  },
  {
    value: "web_order",
    label: "Réclamation de commande",
    description: "Problème avec une commande en ligne ou livraison",
  },
  {
    value: "web_other",
    label: "Autre",
    description: "Toute autre demande ou réclamation",
  },
];

type Props = {
  storesData: PublicComplaintStoresData;
};

export function PublicComplaintForm({ storesData }: Props) {
  const [type, setType] = useState<PublicComplaintType>("web_service");
  const [city, setCity] = useState(storesData.cities[0] || "");
  const [storeId, setStoreId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [message, setMessage] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const storeOptions = useMemo(() => {
    const stores = storesData.storesByCity[city] || [];
    return [
      { value: "", label: "Choisir un magasin", icon: Store },
      ...stores.map((s) => ({ value: s.id, label: s.name, icon: Store })),
    ];
  }, [city, storesData.storesByCity]);

  const cityOptions = useMemo(
    () => [
      { value: "", label: "Choisir une ville", icon: MapPin },
      ...storesData.cities.map((c) => ({ value: c, label: c, icon: MapPin })),
    ],
    [storesData.cities]
  );

  function handleTypeChange(next: PublicComplaintType) {
    setType(next);
    setFormError("");
    setPhotoError("");
  }

  function handleCityChange(next: string) {
    setCity(next);
    setStoreId("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("type", type);

    if (type === "web_service") {
      formData.set("storeId", storeId);
    }

    if (type === "web_order") {
      formData.set("orderNumber", orderNumber);
    }

    try {
      const res = await fetch("/api/reclamation", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as { error?: string; success?: boolean };

      if (!res.ok || data.error) {
        setFormError(data.error || "Une erreur est survenue");
        return;
      }

      setSuccess(true);
      form.reset();
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      setOrderNumber("");
      setMessage("");
      setStoreId("");
    } catch {
      setFormError("Connexion impossible. Vérifiez votre réseau et réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="h-7 w-7 text-success" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Réclamation envoyée</h2>
        <p className="mt-2 text-sm text-muted">
          Merci. Notre équipe a bien reçu votre message et vous recontactera si nécessaire.
        </p>
        <Button type="button" variant="ghost" className="mt-6" onClick={() => setSuccess(false)}>
          Envoyer une autre réclamation
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">Type de réclamation</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {TYPE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                "cursor-pointer rounded-xl border px-3 py-3 transition-colors",
                type === option.value
                  ? "border-primary bg-primary-light/30"
                  : "border-border bg-surface hover:bg-primary-light/15"
              )}
            >
              <input
                type="radio"
                name="complaintType"
                value={option.value}
                checked={type === option.value}
                onChange={() => handleTypeChange(option.value)}
                className="sr-only"
              />
              <p className="text-sm font-semibold text-foreground">{option.label}</p>
              <p className="mt-0.5 text-xs text-muted">{option.description}</p>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Nom complet"
          name="customerName"
          icon={User}
          required
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Votre nom"
          className="w-full"
        />

        <Input
          label="Téléphone"
          name="customerPhone"
          type="tel"
          icon={Phone}
          required
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          placeholder="06 XX XX XX XX"
          className="w-full"
        />

        <div className="sm:col-span-2">
          <Input
            label="Email"
            name="customerEmail"
            type="email"
            icon={Mail}
            required
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="vous@exemple.com"
            className="w-full"
          />
        </div>
      </div>

      {type === "web_service" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectMenu
            label="Ville"
            value={city}
            onChange={handleCityChange}
            options={cityOptions}
            defaultIcon={MapPin}
          />
          <SelectMenu
            label="Magasin"
            value={storeId}
            onChange={setStoreId}
            options={storeOptions}
            defaultIcon={Store}
          />
        </div>
      )}

      {type === "web_order" && (
        <div className="space-y-4">
          <Input
            label="Numéro de commande"
            name="orderNumber"
            icon={Hash}
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="#1234"
            className="w-full"
          />

          <ImageUploadInput
            name="photo"
            label="Photo du problème"
            required
            onError={setPhotoError}
          />
          {photoError && <p className="text-sm text-danger">{photoError}</p>}
        </div>
      )}

      <label className="block text-sm font-medium text-foreground">
        Message
        <div className="relative mt-1.5">
          <span className="pointer-events-none absolute left-3 top-3 flex h-5 w-5 items-center justify-center bg-transparent text-primary">
            <MessageSquare className="h-4 w-4" strokeWidth={2} />
          </span>
          <textarea
            name="message"
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Décrivez votre réclamation en détail…"
            className="natus-field w-full resize-y bg-surface py-2 pl-10 pr-3 text-sm placeholder:text-muted"
          />
        </div>
      </label>

      {formError && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{formError}</p>
      )}

      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">Les champs obligatoires sont marqués sur le formulaire.</p>
        <Button
          type="submit"
          disabled={type === "web_service" && !storeId}
          loading={submitting}
          className="sm:min-w-[220px]"
        >
          <MessageSquareWarning className="h-4 w-4" />
          Envoyer la réclamation
        </Button>
      </div>

      <p className="text-center text-xs text-muted">
        <a href={NATUS_WEBSITE_URL} className="text-primary hover:underline">
          Retour au site Natus
        </a>
      </p>
    </form>
  );
}
