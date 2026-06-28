import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BRAND = "#B38C4A";
const WHITE = "#FFFFFF";

function iconSvg(size, { maskable = false } = {}) {
  const cardSize = maskable ? size : Math.round(size * (432 / 512));
  const radius = maskable ? 0 : Math.round(size * (96 / 512));
  const x = maskable ? 0 : Math.round(size * (40 / 512));
  const y = maskable ? 0 : Math.round(size * (40 / 512));
  const fontSize = maskable
    ? Math.round(size * (128 / 512))
    : Math.round(size * (168 / 512));
  const textY = maskable
    ? Math.round(size * 0.56)
    : y + Math.round(cardSize * 0.58);

  const background = maskable
    ? `<rect width="${size}" height="${size}" fill="${WHITE}"/>`
    : "";

  const card = maskable
    ? ""
    : `<rect x="${x}" y="${y}" width="${cardSize}" height="${cardSize}" rx="${radius}" fill="${WHITE}"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none">
  ${background}
  ${card}
  <text
    x="${Math.round(size / 2)}"
    y="${textY}"
    text-anchor="middle"
    fill="${BRAND}"
    font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif"
    font-size="${fontSize}"
    font-weight="600"
    letter-spacing="-0.02em"
  >natus</text>
</svg>`;
}

async function main() {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.error("Installez sharp : npm install --save-dev sharp");
    process.exit(1);
  }

  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const outDir = join(root, "public", "pwa");
  mkdirSync(outDir, { recursive: true });

  const outputs = [
    { file: "icon-192.png", size: 192, maskable: false },
    { file: "icon-512.png", size: 512, maskable: false },
    { file: "icon-512-maskable.png", size: 512, maskable: true },
    { file: "apple-touch-icon.png", size: 180, maskable: false },
  ];

  for (const item of outputs) {
    const svg = iconSvg(item.size, { maskable: item.maskable });
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    writeFileSync(join(outDir, item.file), png);
    console.log(`Generated public/pwa/${item.file}`);
  }

  writeFileSync(join(outDir, "icon.svg"), iconSvg(512));
  console.log("Generated public/pwa/icon.svg");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
