/* eslint-disable */
// One-off: slice the 1536x1024 running grid into 32 cell PNGs (16 male + 16 female).
// Run: "C:\Program Files\nodejs\node.exe" scripts/split-running-avatars.js
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const SRC = process.argv[2] || "C:/Users/dell/AppData/Local/Temp/51353e5f-40d6-4b69-a86f-baaa7740d773.tmp";
const OUT_DIR = path.join(__dirname, "..", "public", "avatars");

// Top row of each section: cycling has the same 16 events, in same order.
const conditions = [
  ["sunny", "partly-cloudy", "cloudy", "rain", "heavy-rain", "windy", "snow", "foggy"],
  ["hot", "mild", "cool", "cold", "winter", "night-clear", "night-rain", "sunset"],
];

const CELL_W = 192;
const COLS = 8;

// Y offsets (top of illustration) for each row in the 1024-tall grid.
// Measured from a col-0 strip: row 0 illust ~50-220, row 1 ~265-430, row 2 ~555-720, row 3 ~770-935.
const rowY = [40, 300, 545, 810];
const ROW_H = 175;

(async () => {
  if (!fs.existsSync(SRC)) {
    console.error("Source not found:", SRC);
    process.exit(1);
  }
  const meta = await sharp(SRC).metadata();
  console.log(`source ${meta.format} ${meta.width}x${meta.height}`);

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  for (let r = 0; r < 4; r++) {
    const gender = r < 2 ? "male" : "female";
    const conds = conditions[r % 2];
    for (let c = 0; c < COLS; c++) {
      const x = c * CELL_W;
      const y = rowY[r];
      const name = `running-${gender}-${conds[c]}.png`;
      await sharp(SRC)
        .extract({ left: x, top: y, width: CELL_W, height: ROW_H })
        .png()
        .toFile(path.join(OUT_DIR, name));
      console.log("wrote", name);
    }
  }
  console.log("done.");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
