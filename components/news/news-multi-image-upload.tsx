"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const MAX_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 6;

type PreviewItem = {
  id: string;
  url: string;
  file: File;
};

interface NewsMultiImageUploadProps {
  name?: string;
  onError?: (message: string) => void;
  className?: string;
}

export function NewsMultiImageUpload({
  name = "images",
  onError,
  className,
}: NewsMultiImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [dragOver, setDragOver] = useState(false);

  function syncInputFiles(items: PreviewItem[]) {
    const dt = new DataTransfer();
    for (const item of items) {
      dt.items.add(item.file);
    }
    if (inputRef.current) {
      inputRef.current.files = dt.files;
    }
  }

  function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);
    if (!incoming.length) return;

    const next = [...previews];
    for (const file of incoming) {
      if (next.length >= MAX_FILES) {
        onError?.(`Maximum ${MAX_FILES} images`);
        break;
      }
      if (!ACCEPT.split(",").includes(file.type)) {
        onError?.("Format non supporté — JPG, PNG ou WebP uniquement");
        continue;
      }
      if (file.size > MAX_SIZE) {
        onError?.("Fichier trop volumineux — maximum 5 Mo");
        continue;
      }
      next.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        url: URL.createObjectURL(file),
        file,
      });
    }

    setPreviews(next);
    syncInputFiles(next);
    onError?.("");
  }

  function removeItem(id: string) {
    const next = previews.filter((item) => item.id !== id);
    setPreviews(next);
    syncInputFiles(next);
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 transition-colors",
          dragOver
            ? "border-accent bg-accent/5"
            : "border-border hover:border-accent/50 hover:bg-surface-2"
        )}
      >
        <Plus className="h-5 w-5 text-muted" />
        <p className="text-center text-sm text-muted">
          Glissez des photos ou cliquez pour ajouter
          <span className="block text-xs opacity-70">
            Jusqu&apos;à {MAX_FILES} images · 5 Mo max
          </span>
        </p>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {previews.map((item) => (
            <div
              key={item.id}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-surface-2"
            >
              <Image
                src={item.url}
                alt=""
                fill
                unoptimized
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Retirer l'image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
