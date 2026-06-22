"use client";

import { useState } from "react";
import Image from "next/image";
import { Pin, PinOff, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { getAudienceLabel } from "@/lib/news/audience";
import type { NewsAnnouncement } from "@/lib/news/types";

function ImageGallery({ images }: { images: NewsAnnouncement["images"] }) {
  const [index, setIndex] = useState(0);
  if (!images?.length) return null;

  const current = images[index];

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface-2">
      <div className="relative aspect-[16/9] w-full">
        <Image
          src={current.image_url}
          alt=""
          fill
          unoptimized
          className="object-cover"
        />
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() =>
                setIndex((i) => (i === 0 ? images.length - 1 : i - 1))
              }
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white"
              aria-label="Image précédente"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                setIndex((i) => (i === images.length - 1 ? 0 : i + 1))
              }
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white"
              aria-label="Image suivante"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`h-1.5 w-1.5 rounded-full ${
                    i === index ? "bg-white" : "bg-white/40"
                  }`}
                  aria-label={`Image ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-1 overflow-x-auto p-2">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setIndex(i)}
              className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 ${
                i === index ? "border-accent" : "border-transparent"
              }`}
            >
              <Image
                src={img.image_url}
                alt=""
                fill
                unoptimized
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function NewsFeed({
  announcements,
  showAudience = true,
  emptyMessage = "Aucune actualité pour le moment.",
  canManagePost,
  onDelete,
  onTogglePin,
  actionsDisabled = false,
}: {
  announcements: NewsAnnouncement[];
  showAudience?: boolean;
  emptyMessage?: string;
  canManagePost?: (post: NewsAnnouncement) => boolean;
  onDelete?: (id: string) => void;
  onTogglePin?: (id: string, pinned: boolean) => void;
  actionsDisabled?: boolean;
}) {
  if (!announcements.length) {
    return (
      <Card className="text-center text-muted">
        <p>{emptyMessage}</p>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-5">
      {announcements.map((post) => {
        const manageable = canManagePost?.(post) ?? false;

        return (
          <article
            key={post.id}
            className={`natus-card w-full overflow-hidden ${
              post.is_pinned ? "ring-1 ring-accent/30" : ""
            }`}
          >
            <div className="border-b border-border px-6 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {post.is_pinned && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-accent">
                        <Pin className="h-3.5 w-3.5" />
                        Épinglé
                      </span>
                    )}
                    {showAudience && (
                      <Badge>{getAudienceLabel(post)}</Badge>
                    )}
                  </div>
                  <h2 className="mt-1 font-heading text-xl font-semibold text-primary">
                    {post.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {formatDate(post.published_at)}
                    {post.author?.full_name
                      ? ` · ${post.author.full_name}`
                      : post.author?.email
                        ? ` · ${post.author.email}`
                        : ""}
                  </p>
                </div>

                {manageable && (onDelete || onTogglePin) && (
                  <div className="flex shrink-0 gap-1">
                    {onTogglePin && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={actionsDisabled}
                        onClick={() =>
                          onTogglePin(post.id, !post.is_pinned)
                        }
                      >
                        {post.is_pinned ? (
                          <PinOff className="h-4 w-4" />
                        ) : (
                          <Pin className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={actionsDisabled}
                        onClick={() => onDelete(post.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-5">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
                {post.body}
              </p>
              <ImageGallery images={post.images} />
            </div>
          </article>
        );
      })}
    </div>
  );
}
