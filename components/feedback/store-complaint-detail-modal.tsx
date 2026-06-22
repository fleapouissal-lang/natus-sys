"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { Calendar, ExternalLink, Mail, MapPin, MessageSquare, Phone, Tag } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/loyalty/phone";
import type { StoreComplaint } from "@/lib/feedback/complaints";

const SOURCE_LABELS: Record<StoreComplaint["source"], string> = {
  shopify_delivery: "Livraison Shopify",
  pos_sale: "Achat magasin",
  web_service: "Service magasin (web)",
  web_order: "Commande (web)",
  web_other: "Autre (web)",
};

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[7.5rem_1fr] sm:gap-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

export function StoreComplaintDetailModal({
  complaint,
  onClose,
}: {
  complaint: StoreComplaint;
  onClose: () => void;
}) {
  const orderRef =
    complaint.shopify_orders?.order_number ||
    (complaint.order_number ? `#${complaint.order_number.replace(/^#/, "")}` : null);

  return (
    <Modal onClose={onClose} size="lg">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Détail de la réclamation</h3>
          <p className="mt-1 text-sm text-muted">{formatDate(complaint.created_at)}</p>
        </div>
        <Badge variant={complaint.status === "new" ? "danger" : "success"}>
          {complaint.status === "new" ? "Nouvelle" : "Traitée"}
        </Badge>
      </div>

      <dl className="space-y-4">
        <DetailRow label="Source">
          <Badge variant="default">{SOURCE_LABELS[complaint.source]}</Badge>
        </DetailRow>

        {complaint.stores?.name && (
          <DetailRow label="Magasin">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              {complaint.stores.name}
              {complaint.stores.city ? ` · ${complaint.stores.city}` : ""}
            </span>
          </DetailRow>
        )}

        <DetailRow label="Client">
          <div className="space-y-1.5">
            {complaint.customer_name && (
              <p className="font-medium">{complaint.customer_name}</p>
            )}
            <a
              href={`tel:${complaint.customer_phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              <Phone className="h-4 w-4" />
              {formatPhoneDisplay(complaint.customer_phone)}
            </a>
            {complaint.customer_email && (
              <a
                href={`mailto:${complaint.customer_email}`}
                className="flex items-center gap-1.5 text-muted hover:text-primary"
              >
                <Mail className="h-4 w-4" />
                {complaint.customer_email}
              </a>
            )}
          </div>
        </DetailRow>

        {orderRef && (
          <DetailRow label="Référence">
            <span className="inline-flex items-center gap-1.5 font-mono text-sm">
              <Tag className="h-4 w-4 text-primary" />
              {orderRef}
            </span>
          </DetailRow>
        )}

        <DetailRow label="Message">
          <p className="whitespace-pre-wrap leading-relaxed">{complaint.message}</p>
        </DetailRow>

        {complaint.resolved_at && (
          <DetailRow label="Traité le">
            <span className="inline-flex items-center gap-1.5 text-muted">
              <Calendar className="h-4 w-4" />
              {formatDate(complaint.resolved_at)}
            </span>
          </DetailRow>
        )}
      </dl>

      {complaint.photo_url && (
        <div className="mt-6 border-t border-border pt-5">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <MessageSquare className="h-4 w-4 text-primary" />
            Photo jointe
          </p>
          <div className="overflow-hidden rounded-lg border border-border bg-page">
            <Image
              src={complaint.photo_url}
              alt="Photo de la réclamation"
              width={960}
              height={720}
              unoptimized
              className="mx-auto max-h-[min(60vh,28rem)] w-full object-contain"
            />
          </div>
          <a
            href={complaint.photo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Ouvrir en plein écran
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      )}

      <div className="mt-6 flex justify-end border-t border-border pt-4">
        <Button type="button" variant="secondary" onClick={onClose}>
          Fermer
        </Button>
      </div>
    </Modal>
  );
}
