import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getNewsAnnouncementsForProfile } from "@/lib/news/posts";
import { NewsFeed } from "@/components/news/news-feed";

export default async function HubActualitesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const announcements = await getNewsAnnouncementsForProfile(profile);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Actualités</h1>
        <p className="mt-1 text-muted">
          Informations internes pour votre hub
        </p>
      </div>

      <NewsFeed
        announcements={announcements}
        showAudience={false}
        emptyMessage="Aucune actualité pour le moment."
      />
    </div>
  );
}
