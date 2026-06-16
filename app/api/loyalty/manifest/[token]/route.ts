import { NextResponse } from "next/server";
import { getPublicLoyaltyCustomer } from "@/lib/loyalty/customers";
import { applyPrivateCacheHeaders } from "@/lib/security/headers";

const THEME = "#B38C4A";
const BACKGROUND = "#FFFEFB";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const data = await getPublicLoyaltyCustomer(token);

  if (!data) {
    return applyPrivateCacheHeaders(new NextResponse("Not found", { status: 404 }));
  }

  const firstName = data.customer.full_name.trim().split(/\s+/)[0] || "Client";
  const startUrl = `/carte/${token}`;

  const manifest = {
    id: startUrl,
    name: `Carte Natus — ${data.customer.full_name}`,
    short_name: `Natus ${firstName}`,
    description: "Carte fidélité Natus Cosmétiques — points et avantages en magasin",
    start_url: startUrl,
    scope: "/carte/",
    display: "standalone",
    orientation: "portrait",
    background_color: BACKGROUND,
    theme_color: THEME,
    lang: "fr",
    categories: ["shopping", "lifestyle"],
    icons: [
      {
        src: "/api/loyalty/icon/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/loyalty/icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/loyalty/icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  return applyPrivateCacheHeaders(
    NextResponse.json(manifest, {
      headers: {
        "Content-Type": "application/manifest+json",
      },
    })
  );
}
