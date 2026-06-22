import type { UserRole } from "@/lib/types";

export type NewsAudienceType =
  | "all"
  | "city"
  | "managers_city"
  | "cashiers_city"
  | "hub_city"
  | "livreurs_city"
  | "store"
  | "roles";

export type NewsAnnouncementImage = {
  id: string;
  announcement_id: string;
  image_url: string;
  sort_order: number;
};

export type NewsAnnouncement = {
  id: string;
  title: string;
  body: string;
  audience_type: NewsAudienceType;
  target_city: string | null;
  target_store_id: string | null;
  target_roles: UserRole[] | null;
  is_pinned: boolean;
  published_at: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  images?: NewsAnnouncementImage[];
  author?: { full_name: string | null; email: string } | null;
  store?: { name: string; city: string } | null;
};
