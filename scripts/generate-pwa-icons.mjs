// Generates PWA icons from inline SVG sources using sharp.
// Run with: node scripts/generate-pwa-icons.mjs
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = join(__dirname, "..", "public", "icons");

// "any" icon — fills the full canvas. Browsers crop/round it themselves.
const anySvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0c1f33"/>
      <stop offset="100%" stop-color="#030712"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <!-- wind swoosh -->
  <path d="M96 200 Q 200 140, 320 180 T 440 200"
        stroke="url(#accent)" stroke-width="22" stroke-linecap="round" fill="none" opacity="0.9"/>
  <path d="M96 256 Q 220 200, 360 244 T 416 264"
        stroke="url(#accent)" stroke-width="18" stroke-linecap="round" fill="none" opacity="0.65"/>
  <!-- bike wheels -->
  <circle cx="170" cy="370" r="62" fill="none" stroke="url(#accent)" stroke-width="14"/>
  <circle cx="170" cy="370" r="6"  fill="#38bdf8"/>
  <circle cx="342" cy="370" r="62" fill="none" stroke="url(#accent)" stroke-width="14"/>
  <circle cx="342" cy="370" r="6"  fill="#38bdf8"/>
  <!-- frame -->
  <path d="M170 370 L 250 370 L 300 300 L 342 370 M 250 370 L 230 300 L 300 300"
        stroke="#7dd3fc" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>
`;

// "maskable" icon — same art shrunk to 80% with safe-zone padding so platforms
// that mask the icon (Android adaptive) never crop the artwork.
const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0c1f33"/>
      <stop offset="100%" stop-color="#030712"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(51.2 51.2) scale(0.8)">
    <path d="M96 200 Q 200 140, 320 180 T 440 200"
          stroke="url(#accent)" stroke-width="22" stroke-linecap="round" fill="none" opacity="0.9"/>
    <path d="M96 256 Q 220 200, 360 244 T 416 264"
          stroke="url(#accent)" stroke-width="18" stroke-linecap="round" fill="none" opacity="0.65"/>
    <circle cx="170" cy="370" r="62" fill="none" stroke="url(#accent)" stroke-width="14"/>
    <circle cx="170" cy="370" r="6"  fill="#38bdf8"/>
    <circle cx="342" cy="370" r="62" fill="none" stroke="url(#accent)" stroke-width="14"/>
    <circle cx="342" cy="370" r="6"  fill="#38bdf8"/>
    <path d="M170 370 L 250 370 L 300 300 L 342 370 M 250 370 L 230 300 L 300 300"
          stroke="#7dd3fc" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>
</svg>
`;

async function render(svg, size, outPath) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log("wrote", outPath);
}

async function main() {
  await mkdir(ICONS_DIR, { recursive: true });

  // "any" purpose — full bleed art
  await render(anySvg, 192, join(ICONS_DIR, "icon-192.png"));
  await render(anySvg, 512, join(ICONS_DIR, "icon-512.png"));

  // "maskable" purpose — padded safe zone
  await render(maskableSvg, 192, join(ICONS_DIR, "icon-192-maskable.png"));
  await render(maskableSvg, 512, join(ICONS_DIR, "icon-512-maskable.png"));

  // Apple touch icon (180x180, "any" art works well rounded by iOS)
  await render(anySvg, 180, join(ICONS_DIR, "apple-touch-icon.png"));

  // favicons
  await render(anySvg, 32, join(ICONS_DIR, "favicon-32.png"));
  await render(anySvg, 16, join(ICONS_DIR, "favicon-16.png"));

  // Stash the SVG source too — handy if anyone wants to re-render later.
  await writeFile(join(ICONS_DIR, "icon-source.svg"), anySvg.trim());
  await writeFile(join(ICONS_DIR, "icon-source-maskable.svg"), maskableSvg.trim());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
