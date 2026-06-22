"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Newspaper, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewsFeed } from "@/components/news/news-feed";
import { NewsComposeModal } from "@/components/news/news-compose-modal";
import {
  deleteNewsAnnouncement,
  toggleNewsAnnouncementPin,
} from "@/lib/news/actions";
import type { NewsAnnouncement } from "@/lib/news/types";
import type { Profile, Store } from "@/lib/types";

export function NewsManager({
  profile,
  announcements,
  stores,
}: {
  profile: Profile;
  announcements: NewsAnnouncement[];
  stores: Pick<Store, "id" | "name" | "city">[];
}) {
  const router = useRouter();
  const [composeOpen, setComposeOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState("");

  const canManageAll =
    profile.role === "directeur" || profile.role === "admin";

  function canManagePost(post: NewsAnnouncement) {
    return canManageAll || post.created_by === profile.id;
  }

  function handleDelete(id: string) {
    if (!confirm("Supprimer cette actualité ?")) return;
    setActionError("");
    startTransition(async () => {
      const result = await deleteNewsAnnouncement(id);
      if (result.error) {
        setActionError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleTogglePin(id: string, pinned: boolean) {
    setActionError("");
    startTransition(async () => {
      const result = await toggleNewsAnnouncementPin(id, pinned);
      if (result.error) {
        setActionError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Newspaper className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted">
              {announcements.length} publication
              {announcements.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button onClick={() => setComposeOpen(true)}>
          <Plus className="h-4 w-4" />
          Nouvelle actualité
        </Button>
      </div>

      {actionError && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {actionError}
        </p>
      )}

      <NewsFeed
        announcements={announcements}
        canManagePost={canManagePost}
        onDelete={handleDelete}
        onTogglePin={handleTogglePin}
        actionsDisabled={pending}
        emptyMessage="Aucune actualité publiée. Créez la première pour informer vos équipes."
      />

      {composeOpen && (
        <NewsComposeModal
          profile={profile}
          stores={stores}
          onClose={() => setComposeOpen(false)}
        />
      )}
    </div>
  );
}
