import type { Metadata } from "next";
import { GoogleReviewsView } from "@/components/marketing/google-reviews-view";
import { getPublicGoogleReviewsData } from "@/lib/marketing/public-reviews";

export const metadata: Metadata = {
  title: "Google Reviews — Natus Marrakech",
  description:
    "Customer reviews for Natus Cosmetics Guéliz Marrakech. Leave your review on Google Maps.",
  alternates: {
    canonical: "https://natusmarrakech.com/EN/google-reviews",
    languages: {
      fr: "https://natusmarrakech.com/avis-google",
      en: "https://natusmarrakech.com/EN/google-reviews",
    },
  },
};

export default async function GoogleReviewsEnPage() {
  const data = await getPublicGoogleReviewsData();
  return <GoogleReviewsView data={data} locale="en" />;
}
