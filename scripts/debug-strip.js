const sharp = require("sharp");
(async () => {
  const src = "C:/Users/dell/Documents/ridebyweather/public/running-avatars-grid.png";
  await sharp(src).extract({ left: 0, top: 0, width: 192, height: 1024 }).png()
    .toFile("C:/Users/dell/Documents/ridebyweather/scripts/_debug-col0.png");
  await sharp(src).extract({ left: 1344, top: 0, width: 192, height: 1024 }).png()
    .toFile("C:/Users/dell/Documents/ridebyweather/scripts/_debug-col7.png");
  console.log("done");
})();
