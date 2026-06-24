import { NextRequest, NextResponse } from "next/server";

const CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=604800";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const objectPath = decodeURIComponent(path.join("/"));

  if (!objectPath || objectPath.includes("..")) {
    return NextResponse.json({ error: "Chemin invalide" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!supabaseUrl) {
    return NextResponse.json({ error: "Supabase non configuré" }, { status: 500 });
  }

  const remoteUrl = `${supabaseUrl}/storage/v1/object/public/${objectPath}`;
  const upstream = await fetch(remoteUrl, { next: { revalidate: 86400 } });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "Image introuvable", path: objectPath },
      { status: upstream.status }
    );
  }

  const buffer = await upstream.arrayBuffer();
  const contentType =
    upstream.headers.get("content-type") ||
    (objectPath.endsWith(".webp") ? "image/webp" : "image/png");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": CACHE_CONTROL,
    },
  });
}
