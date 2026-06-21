"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const MAX_SIZE = 5 * 1024 * 1024;

interface ImageUploadInputProps {
  name?: string;
  label?: string;
  required?: boolean;
  optional?: boolean;
  previewUrl?: string | null;
  onPreviewChange?: (url: string | null) => void;
  onError?: (message: string) => void;
  className?: string;
}

export function ImageUploadInput({
  name = "image",
  label = "Joindre une photo",
  required = false,
  optional = false,
  previewUrl,
  onPreviewChange,
  onError,
  className,
}: ImageUploadInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const displayPreview = previewUrl ?? localPreview;

  function validateAndSet(file: File) {
    if (!ACCEPT.split(",").includes(file.type)) {
      onError?.("Format non supporté — JPG, PNG ou WebP uniquement");
      return;
    }
    if (file.size > MAX_SIZE) {
      onError?.("Fichier trop volumineux — maximum 5 Mo");
      return;
    }

    const url = URL.createObjectURL(file);
    setLocalPreview(url);
    setFileName(file.name);
    onPreviewChange?.(url);
    onError?.("");

    const dt = new DataTransfer();
    dt.items.add(file);
    if (inputRef.current) {
      inputRef.current.files = dt.files;
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) validateAndSet(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSet(file);
  }

  function openPicker() {
    inputRef.current?.click();
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <input
        ref={inputRef}
        name={name}
        type="file"
        accept={ACCEPT}
        required={required && !displayPreview}
        onChange={handleChange}
        className="sr-only"
        tabIndex={-1}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-primary/35 bg-surface hover:border-primary/55 hover:bg-primary/[0.03]"
        )}
      >
        {displayPreview ? (
          <div className="flex w-full flex-col items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayPreview}
              alt="Aperçu"
              className="max-h-44 w-full object-contain"
            />
            {fileName && (
              <p className="max-w-full truncate text-xs text-muted">{fileName}</p>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openPicker();
              }}
              className="rounded-full border border-primary px-6 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
            >
              Changer la photo
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-transparent">
              <Plus className="h-6 w-6 text-primary" strokeWidth={2} />
            </div>

            <p className="text-base font-semibold text-primary">{label}</p>
            <p className="mt-1 text-sm text-muted">
              {optional ? "Optionnel — " : ""}
              JPG, PNG ou WebP
            </p>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openPicker();
              }}
              className="mt-5 rounded-full border border-primary px-8 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
            >
              Choisir une photo
            </button>
          </>
        )}
      </div>

      <p className="text-center text-xs text-muted">Maximum 5 Mo</p>
    </div>
  );
}
