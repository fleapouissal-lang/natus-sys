"use client";

import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_WRITEOFF_PHOTOS } from "@/lib/store-writeoffs/types";
import type { StoreWriteoffPhoto } from "@/lib/store-writeoffs/types";

type PendingPhoto = {
  id: string;
  file: File;
  previewUrl: string;
};

export function WriteoffPhotoUpload({
  photos,
  onChange,
  disabled = false,
}: {
  photos: PendingPhoto[];
  onChange: (photos: PendingPhoto[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  function addFiles(fileList: FileList | null) {
    if (!fileList || disabled) return;
    setError("");

    const next = [...photos];
    for (const file of Array.from(fileList)) {
      if (next.length >= MAX_WRITEOFF_PHOTOS) {
        setError(`Maximum ${MAX_WRITEOFF_PHOTOS} photos`);
        break;
      }
      if (!file.type.startsWith("image/")) {
        setError("Seules les images sont acceptées");
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Chaque photo doit faire moins de 5 Mo");
        continue;
      }
      next.push({
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removePhoto(id: string) {
    onChange(photos.filter((photo) => photo.id !== id));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Photos (optionnel)</p>
          <p className="text-xs text-muted">
            Jusqu&apos;à {MAX_WRITEOFF_PHOTOS} photos · JPG, PNG, WebP, GIF · max 5 Mo
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || photos.length >= MAX_WRITEOFF_PHOTOS}
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="h-4 w-4" />
          Ajouter photo{photos.length > 0 ? "s" : ""}
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {photos.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.previewUrl}
                alt=""
                className="h-20 w-20 rounded-lg border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(photo.id)}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-muted hover:text-danger cursor-pointer"
                aria-label="Retirer la photo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

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
