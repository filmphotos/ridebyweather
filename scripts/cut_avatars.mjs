import sharp from "sharp";
import { mkdirSync } from "fs";

const SRC = "C:/Users/dell/Desktop/ca28a3587fe61e37b81d221195da91fbf03aa081b8415895613e41d1742e61e5.png";
const APP = "C:/Users/dell/Documents/ridebyweather/public/avatars";
const PIX = "C:/Users/dell/Desktop/pix";
mkdirSync(`${PIX}/running`, { recursive: true });
mkdirSync(`${PIX}/walking`, { recursive: true });

const COL0 = 56;
const COLW = (1434 - COL0) / 8;
const PW = 98;      // person crop width within a column (text starts ~100px in)
const OFF = 0;

// per sport+gender row geometry (top/height) — extended to include feet
const ROWS = {
  running: { male: { top: 124, height: 188 }, female: { top: 308, height: 182 } },
  walking: { male: { top: 574, height: 174 }, female: { top: 742, height: 128 } },
};

// infographic column index -> app condition filenames it should feed
const COL_CONDITIONS = {
  0: ["hot", "sunny", "sunset"],
  1: ["mild", "partly-cloudy"],
  2: ["cool", "cloudy", "foggy"],
  3: ["cold"],
  4: ["winter", "snow"],
  5: ["rain", "heavy-rain"],
  6: ["windy"],
  7: ["night-clear", "night-rain"],
};

const BG = { r: 245, g: 240, b: 232 }; // #f5f0e8 card background
const OUTW = 150, OUTH = 200;

let count = 0;
for (const sport of Object.keys(ROWS)) {
  for (const gender of Object.keys(ROWS[sport])) {
    const { top, height } = ROWS[sport][gender];
    for (let i = 0; i < 8; i++) {
      const left = Math.round(COL0 + i * COLW + OFF);
      const buf = await sharp(SRC)
        .extract({ left, top, width: PW, height })
        .resize({ width: OUTW, height: OUTH, fit: "contain", background: BG })
        .flatten({ background: BG })
        .png()
        .toBuffer();
      for (const cond of COL_CONDITIONS[i]) {
        const name = `${sport}-${gender}-${cond}.png`;
        await sharp(buf).toFile(`${APP}/${name}`);
        await sharp(buf).toFile(`${PIX}/${sport}/${name}`);
        count++;
      }
    }
  }
}
console.log("wrote", count, "files (x2: app + pix)");
