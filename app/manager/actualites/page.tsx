import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getActiveStores } from "@/lib/inventory";
import { getCityFilter } from "@/lib/permissions";
import { getNewsAnnouncementsForManagement } from "@/lib/news/posts";
import { NewsManager } from "@/components/news/news-manager";

export default async function ManagerActualitesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const cityFilter = getCityFilter(profile);
  const [announcements, stores] = await Promise.all([
    getNewsAnnouncementsForManagement(profile),
    getActiveStores(cityFilter),
  ]);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Journal des actualités</h1>
        <p className="mt-1 text-muted">
          Publiez des informations pour vos équipes — ciblez toute l&apos;entreprise,
          une ville, un magasin ou un rôle précis
        </p>
      </div>

      <NewsManager
        profile={profile}
        announcements={announcements}
        stores={stores}
      />
    </div>
  );
}
