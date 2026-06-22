import { createClient } from "@/lib/supabase/server";
import { getStoreById } from "@/lib/inventory";
import { isDirector } from "@/lib/permissions";
import type { Profile } from "@/lib/types";
import { isAnnouncementVisibleToProfile } from "@/lib/news/audience";
import type { NewsAnnouncement } from "@/lib/news/types";

const ANNOUNCEMENT_SELECT = `
  *,
  images:news_announcement_images(id, announcement_id, image_url, sort_order),
  author:profiles!news_announcements_created_by_fkey(full_name, email),
  store:stores!news_announcements_target_store_id_fkey(name, city)
`;

function sortAnnouncements(posts: NewsAnnouncement[]): NewsAnnouncement[] {
  return [...posts].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return (
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );
  });
}

function normalizeAnnouncement(row: NewsAnnouncement): NewsAnnouncement {
  const images = [...(row.images ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  return { ...row, images };
}

async function resolveStoreCity(profile: Profile): Promise<string | null> {
  if (profile.stores?.city) return profile.stores.city;
  if (!profile.store_id) return null;
  const store = await getStoreById(profile.store_id);
  return store?.city ?? null;
}

export async function getNewsAnnouncementsForProfile(
  profile: Profile
): Promise<NewsAnnouncement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news_announcements")
    .select(ANNOUNCEMENT_SELECT)
    .order("published_at", { ascending: false });

  if (error || !data) return [];

  const storeCity = await resolveStoreCity(profile);
  const visible = (data as NewsAnnouncement[])
    .map(normalizeAnnouncement)
    .filter((post) =>
      isAnnouncementVisibleToProfile(post, profile, storeCity)
    );

  return sortAnnouncements(visible);
}

export async function getNewsAnnouncementsForManagement(
  profile: Profile
): Promise<NewsAnnouncement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news_announcements")
    .select(ANNOUNCEMENT_SELECT)
    .order("published_at", { ascending: false });

  if (error || !data) return [];

  const storeCity = await resolveStoreCity(profile);
  const rows = (data as NewsAnnouncement[]).map(normalizeAnnouncement);

  if (isDirector(profile)) {
    return sortAnnouncements(rows);
  }

  const visible = rows.filter(
    (post) =>
      isAnnouncementVisibleToProfile(post, profile, storeCity, {
        includeAuthored: true,
      }) ||
      (post.target_city && profile.city && post.target_city === profile.city)
  );

  return sortAnnouncements(visible);
}
