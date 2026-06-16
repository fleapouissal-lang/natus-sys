import { ImageResponse } from "next/og";

const ALLOWED = new Set([180, 192, 512]);

export async function GET(
  _request: Request,
  context: { params: Promise<{ size: string }> }
) {
  const { size: sizeParam } = await context.params;
  const size = parseInt(sizeParam, 10);

  if (!ALLOWED.has(size)) {
    return new Response("Invalid size", { status: 400 });
  }

  const fontSize = Math.round(size * 0.42);
  const subSize = Math.round(size * 0.07);

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
          background: "linear-gradient(165deg, #C9A066 0%, #B38C4A 48%, #8F6B38 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFF6EC",
            fontFamily: "Georgia, serif",
          }}
        >
          <span style={{ fontSize, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em" }}>
            natus
          </span>
          <span
            style={{
              marginTop: size * 0.04,
              fontSize: subSize,
              letterSpacing: "0.32em",
              opacity: 0.9,
            }}
          >
            MARRAKECH
          </span>
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
    }
  );
}
