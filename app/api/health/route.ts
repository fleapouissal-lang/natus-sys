export async function GET() {
  return Response.json({ ok: true, ts: Date.now() });
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}
