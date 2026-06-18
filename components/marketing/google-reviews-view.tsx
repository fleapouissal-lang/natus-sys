import Link from "next/link";
import {
  formatReviewDate,
  NATUS_WEBSITE_URL,
  starsText,
  type PublicGoogleReviewsData,
} from "@/lib/marketing/public-reviews";

type Locale = "fr" | "en";

const COPY = {
  fr: {
    title: "Avis Google — Natus Marrakech",
    subtitle: "Ce que nos clientes et clients disent de Natus Cosmétiques",
    average: "Note moyenne",
    reviews: "avis clients",
    leaveReview: "Laisser un avis sur Google",
    seeOnMaps: "Voir sur Google Maps",
    noReviews: "Soyez la première à laisser un avis sur Google !",
    back: "Retour au site",
    verified: "Avis client Natus",
    location: "Guéliz, Marrakech",
  },
  en: {
    title: "Google Reviews — Natus Marrakech",
    subtitle: "What our customers say about Natus Cosmetics",
    average: "Average rating",
    reviews: "customer reviews",
    leaveReview: "Leave a review on Google",
    seeOnMaps: "View on Google Maps",
    noReviews: "Be the first to leave a review on Google!",
    back: "Back to website",
    verified: "Natus customer review",
    location: "Gueliz, Marrakech",
  },
} as const;

type Props = {
  data: PublicGoogleReviewsData;
  locale: Locale;
};

export function GoogleReviewsView({ data, locale }: Props) {
  const t = COPY[locale];
  const avgDisplay = data.totalReviews > 0 ? data.averageRating.toFixed(1) : "5.0";
  const siteHome = locale === "en" ? `${NATUS_WEBSITE_URL}/EN` : NATUS_WEBSITE_URL;
  const altLocale = locale === "en" ? "fr" : "en";
  const altHref = locale === "en" ? "/avis-google" : "/EN/google-reviews";
  const altLabel = locale === "en" ? "Français" : "English";

  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-primary/20 bg-surface px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Link
            href={siteHome}
            className="font-heading text-lg font-bold tracking-wide text-primary"
          >
            NATUS
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href={altHref} className="text-muted hover:text-primary">
              {altLabel}
            </Link>
            <Link
              href={siteHome}
              className="text-muted hover:text-primary"
            >
              {t.back}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Google Reviews · {t.location}
          </p>
          <h1 className="mt-3 font-heading text-3xl font-bold text-foreground sm:text-4xl">
            {t.title}
          </h1>
          <p className="mt-3 text-muted">{t.subtitle}</p>
        </div>

        <div className="mt-10 border border-primary/30 bg-surface p-6 text-center shadow-sm sm:p-8">
          <p className="text-4xl font-bold text-primary">{avgDisplay}</p>
          <p className="mt-2 text-lg tracking-wider text-primary">{starsText(Math.round(Number(avgDisplay)))}</p>
          <p className="mt-2 text-sm text-muted">
            {t.average}
            {data.totalReviews > 0 ? ` · ${data.totalReviews} ${t.reviews}` : ""}
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href={data.writeReviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-w-[220px] items-center justify-center bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-dark"
            >
              {t.leaveReview}
            </a>
            <a
              href={data.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-w-[220px] items-center justify-center border border-primary/40 px-6 py-3 text-sm font-semibold text-primary hover:bg-primary/5"
            >
              {t.seeOnMaps}
            </a>
          </div>
        </div>

        <div className="mt-10 overflow-hidden border border-primary/20 bg-surface">
          <iframe
            title={`${data.storeName} — Google Maps`}
            src={`https://maps.google.com/maps?q=${encodeURIComponent(`${data.storeName} ${data.city}`)}&hl=${locale}&z=16&output=embed`}
            className="h-64 w-full border-0 sm:h-80"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>

        <section className="mt-10">
          <h2 className="font-heading text-xl font-bold text-foreground">
            {locale === "en" ? "Customer reviews" : "Avis clients"}
          </h2>

          {data.reviews.length === 0 ? (
            <p className="mt-4 text-muted">{t.noReviews}</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {data.reviews.map((review, index) => (
                <li
                  key={`${review.createdAt}-${index}`}
                  className="border border-primary/20 bg-surface p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-foreground">
                      {review.customerName || (locale === "en" ? "Customer" : "Cliente")}
                    </p>
                    <p className="text-sm text-primary">{starsText(review.rating)}</p>
                  </div>
                  {review.message && (
                    <p className="mt-3 text-sm leading-relaxed text-foreground">
                      {review.message}
                    </p>
                  )}
                  <p className="mt-3 text-xs text-muted">
                    {t.verified} · {formatReviewDate(review.createdAt, locale)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-10 text-center">
          <a
            href={data.writeReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center bg-primary px-8 py-3 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            {t.leaveReview}
          </a>
        </div>
      </main>

      <footer className="mt-12 border-t border-primary/20 px-4 py-6 text-center text-xs text-muted">
        <p>
          {data.storeName} — {data.city} ·{" "}
          <a href={NATUS_WEBSITE_URL} className="text-primary hover:underline">
            natusmarrakech.com
          </a>
        </p>
      </footer>
    </div>
  );
}
