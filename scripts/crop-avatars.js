const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const SOURCE = path.join(__dirname, "..", "public", "hero-avatars-grid.png");
const OUT_DIR = path.join(__dirname, "..", "public", "avatars");

const ROW_LABELS = [
  // Male row 1: weather conditions
  ["male", ["sunny", "partly-cloudy", "cloudy", "rain", "heavy-rain", "windy", "snow", "foggy"]],
  // Male row 2: outfit/temperature themes
  ["male", ["hot", "mild", "cool", "cold", "winter", "night-clear", "night-rain", "sunset"]],
  // Female row 1: weather conditions
  ["female", ["sunny", "partly-cloudy", "cloudy", "rain", "heavy-rain", "windy", "snow", "foggy"]],
  // Female row 2: outfit/temperature themes
  ["female", ["hot", "mild", "cool", "cold", "winter", "night-clear", "night-rain", "sunset"]],
];

async function main() {
  const meta = await sharp(SOURCE).metadata();
  console.log(`Source: ${meta.width}x${meta.height}`);

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const cols = 8;
  const cellW = Math.floor(meta.width / cols);

  // Vertical bands — avatar art only, no label text. Labels are rendered in the UI.
  const H = meta.height;
  const bands = [
    // MALE
    { top: Math.round(H * 0.065), bottom: Math.round(H * 0.235) }, // row 1 (weather)
    { top: Math.round(H * 0.305), bottom: Math.round(H * 0.470) }, // row 2 (outfit/temp)
    // FEMALE
    { top: Math.round(H * 0.585), bottom: Math.round(H * 0.740) }, // row 1 (weather)
    { top: Math.round(H * 0.810), bottom: Math.round(H * 0.965) }, // row 2 (outfit/temp)
  ];

  let written = 0;
  for (let r = 0; r < 4; r++) {
    const [gender, labels] = ROW_LABELS[r];
    const { top, bottom } = bands[r];
    const cellH = bottom - top;
    for (let c = 0; c < cols; c++) {
      const left = c * cellW;
      const outName = `cycling-${gender}-${labels[c]}.png`;
      const outPath = path.join(OUT_DIR, outName);
      await sharp(SOURCE)
        .extract({ left, top, width: cellW, height: cellH })
        .toFile(outPath);
      written++;
    }
  }
  console.log(`Wrote ${written} avatars to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
