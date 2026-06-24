import { ImageResponse } from "next/og";

const ALLOWED_SIZES = new Set(["192", "512"]);

export async function GET(
  _request: Request,
  context: { params: Promise<{ size: string }> }
) {
  const { size } = await context.params;

  if (!ALLOWED_SIZES.has(size)) {
    return new Response("Not found", { status: 404 });
  }

  const px = parseInt(size, 10);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#FFFDF9",
          border: `${Math.max(2, Math.round(px * 0.02))}px solid #B38C4A`,
        }}
      >
        <div
          style={{
            fontSize: Math.round(px * 0.22),
            color: "#B38C4A",
            fontFamily: "Georgia, serif",
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
        >
          natus
        </div>
        {px >= 192 ? (
          <div
            style={{
              fontSize: Math.round(px * 0.05),
              color: "#B38C4A",
              opacity: 0.65,
              letterSpacing: "0.35em",
              marginTop: Math.round(px * 0.02),
            }}
          >
            MARRAKECH
          </div>
        ) : null}
      </div>
    ),
    { width: px, height: px }
  );
}
