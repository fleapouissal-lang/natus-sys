import { NextRequest, NextResponse } from "next/server";
import { resolveShortLink } from "@/lib/short-url";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const link = await resolveShortLink(code);

  if (!link || link.kind !== "loyalty_card") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.redirect(new URL(`/carte/${link.token}`, request.url));
}
