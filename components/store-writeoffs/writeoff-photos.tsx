"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { MAX_WRITEOFF_PHOTOS } from "@/lib/store-writeoffs/types";
import type { StoreWriteoffPhoto } from "@/lib/store-writeoffs/types";
import { cn } from "@/lib/utils";

type PendingPhoto = {
  id: string;
  file: File;
  previewUrl: string;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

function validateAndCollectFiles(
  fileList: FileList | File[],
  photos: PendingPhoto[],
  maxPhotos: number
): { next: PendingPhoto[]; error?: string } {
  const next = [...photos];
  let error = "";

  for (const file of Array.from(fileList)) {
    if (next.length >= maxPhotos) {
      error = `Maximum ${maxPhotos} photo${maxPhotos !== 1 ? "s" : ""}`;
      break;
    }
    if (!file.type.startsWith("image/")) {
      error = "Seules les images sont acceptées";
      continue;
    }
    if (file.size > 5 * 1024 * 1024) {
      error = "Chaque photo doit faire moins de 5 Mo";
      continue;
    }
    next.push({
      id: `${file.name}-${file.lastModified}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
    });
  }

  return { next, error: error || undefined };
}

export function WriteoffPhotoUpload({
  photos,
  onChange,
  disabled = false,
  compact = false,
  maxPhotos = MAX_WRITEOFF_PHOTOS,
  label = "Photos (optionnel)",
  hint,
}: {
  photos: PendingPhoto[];
  onChange: (photos: PendingPhoto[]) => void;
  disabled?: boolean;
  compact?: boolean;
  maxPhotos?: number;
  label?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const remaining = Math.max(0, maxPhotos - photos.length);

  function addFiles(fileList: FileList | null) {
    if (!fileList || disabled || remaining === 0) return;

    const { next, error: validationError } = validateAndCollectFiles(
      fileList,
      photos,
      maxPhotos
    );
    onChange(next);
    setError(validationError ?? "");
    if (inputRef.current) inputRef.current.value = "";
  }

  function removePhoto(id: string) {
    onChange(photos.filter((photo) => photo.id !== id));
    setError("");
  }

  function openPicker() {
    if (!disabled && remaining > 0) inputRef.current?.click();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }

  const hintText =
    hint ??
    `Jusqu'à ${maxPhotos} photo${maxPhotos !== 1 ? "s" : ""} · JPG, PNG, WebP, GIF · max 5 Mo`;

  if (compact) {
    return (
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted">{label}</p>
        <div className="flex flex-wrap items-center gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.previewUrl}
                alt=""
                className="h-11 w-11 rounded-lg border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(photo.id)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-sm hover:text-danger cursor-pointer"
                aria-label="Retirer la photo"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {remaining > 0 && (
            <button
              type="button"
              disabled={disabled}
              onClick={openPicker}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-dashed border-primary/40 bg-surface text-primary transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-40 cursor-pointer"
              aria-label="Ajouter une photo produit"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
          )}

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-muted">{hintText}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => addFiles(e.target.files)}
      />

      <div
        role="button"
        tabIndex={disabled || remaining === 0 ? -1 : 0}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragOver={(e) => {
          if (disabled || remaining === 0) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "rounded-xl border-2 border-dashed transition-colors",
          disabled || remaining === 0
            ? "cursor-not-allowed border-border bg-page opacity-60"
            : "cursor-pointer",
          !disabled &&
            remaining > 0 &&
            (dragOver
              ? "border-primary bg-primary/5"
              : "border-primary/30 bg-surface hover:border-primary/50 hover:bg-primary/[0.03]")
        )}
      >
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-primary/25 bg-champagne/30">
              <Camera className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">Ajouter des photos au retour</p>
            <p className="mt-1 max-w-xs text-xs text-muted">
              Cliquez ou glissez-déposez vos images ici
            </p>
            {remaining > 0 && (
              <span className="mt-3 rounded-full bg-page px-3 py-1 text-[11px] font-medium text-muted">
                {remaining} emplacement{remaining !== 1 ? "s" : ""} disponible
                {remaining !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        ) : (
          <div className="p-3">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-page"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.previewUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePhoto(photo.id);
                    }}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white hover:bg-danger cursor-pointer"
                    aria-label="Retirer la photo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {remaining > 0 && !disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openPicker();
                  }}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-primary/35 bg-page text-primary transition-colors hover:border-primary hover:bg-primary/5 cursor-pointer"
                  aria-label="Ajouter une photo"
                >
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[10px] font-medium">Ajouter</span>
                </button>
              )}
            </div>

            <p className="mt-2 text-center text-[11px] text-muted">
              {photos.length} / {maxPhotos} photo{maxPhotos !== 1 ? "s" : ""}
              {remaining > 0 ? ` · ${remaining} restante${remaining !== 1 ? "s" : ""}` : ""}
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function WriteoffPhotosGallery({
  photos,
  compact = false,
}: {
  photos: StoreWriteoffPhoto[];
  compact?: boolean;
}) {
  if (!photos.length) return null;

  const sorted = [...photos].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className={`flex flex-wrap gap-2 border-t border-border ${compact ? "px-0 py-2" : "px-4 py-3 md:px-6"}`}>
      {sorted.map((photo) => (
        <a
          key={photo.id}
          href={photo.public_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-lg border border-border"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.public_url}
            alt="Photo retour stock"
            className={`${compact ? "h-16 w-16" : "h-20 w-20"} object-cover`}
          />
        </a>
      ))}
    </div>
  );
}

export type { PendingPhoto };
