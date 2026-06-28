import { NextResponse } from "next/server";

const ALLOWED_SIZES = new Set(["192", "512"]);

/** Redirection vers les PNG statiques (compatibilité anciennes URLs). */
export async function GET(
  request: Request,
  context: { params: Promise<{ size: string }> }
) {
  const { size } = await context.params;
  const maskable = new URL(request.url).searchParams.get("maskable") === "1";

  if (!ALLOWED_SIZES.has(size)) {
    return new Response("Not found", { status: 404 });
  }

  const file =
    size === "512" && maskable ? "/pwa/icon-512-maskable.png" : `/pwa/icon-${size}.png`;

  return NextResponse.redirect(new URL(file, request.url), 307);
}
