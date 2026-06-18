import type { Metadata } from "next";
import { GoogleReviewsView } from "@/components/marketing/google-reviews-view";
import { getPublicGoogleReviewsData } from "@/lib/marketing/public-reviews";

export const metadata: Metadata = {
  title: "Avis Google — Natus Marrakech",
  description:
    "Avis clients Natus Cosmétiques Guéliz Marrakech. Laissez votre avis sur Google Maps.",
  alternates: {
    canonical: "https://natusmarrakech.com/avis-google",
    languages: {
      fr: "https://natusmarrakech.com/avis-google",
      en: "https://natusmarrakech.com/EN/google-reviews",
    },
  },
};

export default async function AvisGooglePage() {
  const data = await getPublicGoogleReviewsData();
  return <GoogleReviewsView data={data} locale="fr" />;
}
