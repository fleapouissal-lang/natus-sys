"use client";

import { useEffect, useState, useTransition } from "react";
import { BriefcaseBusiness, Copy, Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { LoyaltyCardQr } from "@/components/loyalty/loyalty-card-qr";
import { getStoreProClientLink } from "@/lib/actions";

const QR_CACHE_PREFIX = "natus-pro-client-qr:";

function cacheKey(storeId: string) {
  return `${QR_CACHE_PREFIX}${storeId}`;
}

export function ProClientQrModal({
  storeId,
  storeName,
  onClose,
}: {
  storeId: string;
  storeName?: string;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!storeId) {
      setError("Magasin non configuré pour ce compte");
      return;
    }

    try {
      const cached = sessionStorage.getItem(cacheKey(storeId));
      if (cached) {
        setInviteUrl(cached);
        return;
      }
    } catch {
      // ignore storage errors
    }

    startTransition(async () => {
      const result = await getStoreProClientLink(storeId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setInviteUrl(result.url);
      try {
        sessionStorage.setItem(cacheKey(storeId), result.url);
      } catch {
        // ignore storage errors
      }
    });
  }, [storeId]);

  async function copyUrl() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Impossible de copier le lien");
    }
  }

  return (
    <Modal onClose={onClose} size="md">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <BriefcaseBusiness className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold">Inscription normale</h3>
        <p className="mt-1 text-sm text-muted">
          {storeName
            ? `QR fixe · ${storeName}`
            : "QR permanent d'inscription Client Pro"}
        </p>
      </div>

      <div className="mt-6 flex flex-col items-center gap-4">
        {inviteUrl ? (
          <>
            <div className="rounded-2xl border border-primary/20 bg-white p-4 shadow-sm">
              <LoyaltyCardQr value={inviteUrl} size={220} scanOptimized />
            </div>
            <p className="max-w-full break-all px-2 font-mono text-xs text-muted">{inviteUrl}</p>
            <Button type="button" variant="secondary" size="sm" onClick={() => void copyUrl()}>
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-success" />
                  Lien copié
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copier l&apos;URL
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted">
            {pending ? "Chargement du QR code…" : "Impossible d'afficher le QR code"}
          </div>
        )}

        {error && (
          <p className="w-full rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}

        <Button type="button" variant="secondary" onClick={onClose}>
          Fermer
        </Button>

        <p className="text-xs text-muted">
          Lien permanent · plusieurs inscriptions possibles · un QR par magasin
        </p>
      </div>
    </Modal>
  );
}

export function ProClientQrButton({
  storeId,
  storeName,
  disabled,
}: {
  storeId: string;
  storeName?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled || !storeId}
        onClick={() => setOpen(true)}
        title="Inscription normale — QR fixe"
      >
        <BriefcaseBusiness className="h-4 w-4" />
        Client Pro
      </Button>

      {open && storeId && (
        <ProClientQrModal
          storeId={storeId}
          storeName={storeName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
