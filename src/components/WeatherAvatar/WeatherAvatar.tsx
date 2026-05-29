"use client";

import Image from "next/image";

interface WeatherAvatarProps {
  tempF: number;
  precipProb: number;
  windSpeedMph: number;
  gender?: "male" | "female";
  sport?: "cycling" | "running" | "walking";
}

function selectAvatar(
  tempF: number,
  precipProb: number,
  windSpeedMph: number,
  gender: "male" | "female",
  sport: "cycling" | "running" | "walking",
): string {
  // Walking shares the running avatar set (same gear logic, no separate art)
  const avatarSport = sport === "walking" ? "running" : sport;
  const isRainy = precipProb > 0.4;
  const isHeavyRain = precipProb > 0.7;
  const isWindy = windSpeedMph > 18;
  const isSnow = isRainy && tempF < 33;

  let condition: string;
  if (isSnow) condition = "snow";
  else if (isHeavyRain) condition = "heavy-rain";
  else if (isRainy) condition = "rain";
  else if (isWindy && tempF < 60) condition = "windy";
  else if (tempF < 35) condition = "winter";
  else if (tempF < 45) condition = "cold";
  else if (tempF < 58) condition = "cool";
  else if (tempF < 72) condition = "mild";
  else condition = "hot";

  return `/avatars/${avatarSport}-${gender}-${condition}.png`;
}

type Band = "hot" | "warm" | "mild" | "cool" | "chilly" | "cold" | "veryCold" | "frigid";

// Temperature bands, labels, and ranges taken straight from the guide.
const BANDS: { key: Band; label: string; range: string; min: number; badge: string }[] = [
  { key: "hot",      label: "Hot",       range: "90°F+",      min: 90,        badge: "bg-orange-900/40 text-orange-400" },
  { key: "warm",     label: "Warm",      range: "80–89°F",    min: 80,        badge: "bg-yellow-900/40 text-yellow-400" },
  { key: "mild",     label: "Mild",      range: "70–79°F",    min: 70,        badge: "bg-green-900/40 text-green-400" },
  { key: "cool",     label: "Cool",      range: "60–69°F",    min: 60,        badge: "bg-green-900/40 text-green-400" },
  { key: "chilly",   label: "Chilly",    range: "50–59°F",    min: 50,        badge: "bg-blue-800/40 text-blue-400" },
  { key: "cold",     label: "Cold",      range: "40–49°F",    min: 40,        badge: "bg-blue-800/40 text-blue-400" },
  { key: "veryCold", label: "Very Cold", range: "30–39°F",    min: 30,        badge: "bg-blue-900/50 text-blue-300" },
  { key: "frigid",   label: "Very Cold", range: "Under 30°F", min: -Infinity, badge: "bg-blue-900/50 text-blue-300" },
];

function getBand(tempF: number) {
  return BANDS.find((b) => tempF >= b.min) ?? BANDS[BANDS.length - 1];
}

// Clothing recommendations transcribed verbatim from the RideByWeather Clothing & SPF
// Guide. `f` overrides `m` only where the guide's Female column differs.
const CLOTHING: Record<"cycling" | "running" | "walking", Record<Band, { m: string; f?: string }>> = {
  cycling: {
    hot:      { m: "Short sleeve jersey, bib shorts, thin socks, sunglasses, SPF 50", f: "Short sleeve jersey or tank, bib shorts or shorts, thin socks, sunglasses, SPF 50" },
    warm:     { m: "Short sleeve jersey, bib shorts, fingerless gloves, SPF 30-50", f: "Short sleeve jersey, bib shorts or shorts, fingerless gloves, SPF 30-50" },
    mild:     { m: "Short sleeve jersey, bib shorts, sunglasses, SPF if UV 3+", f: "Short sleeve jersey, bib shorts or shorts, sunglasses, SPF if UV 3+" },
    cool:     { m: "Light long sleeve or short sleeve with arm warmers, bib shorts", f: "Light long sleeve or short sleeve with arm warmers, shorts or bib shorts" },
    chilly:   { m: "Long sleeve jersey, knee warmers or tights, full-finger gloves", f: "Long sleeve jersey, tights or knee warmers, full-finger gloves" },
    cold:     { m: "Thermal jersey, wind jacket, tights, warm gloves, ear cover" },
    veryCold: { m: "Base layer, thermal jacket, winter tights, insulated gloves, shoe covers" },
    frigid:   { m: "Heavy winter kit, face cover, thermal socks, lobster gloves" },
  },
  running: {
    hot:      { m: "Singlet or light tee, split shorts, running cap, sunglasses, SPF 50", f: "Tank or light tee, shorts, sports bra, running cap, sunglasses, SPF 50" },
    warm:     { m: "Light tee or singlet, shorts, thin socks, SPF 30-50", f: "Light tee or tank, shorts, thin socks, SPF 30-50" },
    mild:     { m: "Short sleeve shirt, shorts, SPF if UV 3+", f: "Short sleeve shirt or tank, shorts, SPF if UV 3+" },
    cool:     { m: "Short sleeve or light long sleeve, shorts", f: "Short sleeve or light long sleeve, shorts or light tights" },
    chilly:   { m: "Long sleeve tech shirt, shorts or light tights, light gloves optional" },
    cold:     { m: "Base layer or thermal top, running tights, gloves, ear band" },
    veryCold: { m: "Thermal layer, wind shell, tights, warm gloves, hat" },
    frigid:   { m: "Heavy thermal layers, windproof shell, insulated gloves, hat or face cover" },
  },
  walking: {
    hot:      { m: "Breathable shirt, shorts, walking shoes, hat, sunglasses, SPF 50", f: "Breathable top, shorts or skort, walking shoes, hat, sunglasses, SPF 50" },
    warm:     { m: "Light shirt, shorts, hat, sunglasses, SPF 30-50", f: "Light top, shorts or lightweight pants, hat, sunglasses, SPF 30-50" },
    mild:     { m: "T-shirt or polo, shorts or light pants, SPF if UV 3+", f: "T-shirt or light blouse, shorts or light pants, SPF if UV 3+" },
    cool:     { m: "Light jacket or hoodie, comfortable pants" },
    chilly:   { m: "Long sleeve shirt, light jacket, pants", f: "Long sleeve top, light jacket, pants" },
    cold:     { m: "Warm jacket, pants, light gloves, hat optional" },
    veryCold: { m: "Winter coat, hat, gloves, warm socks" },
    frigid:   { m: "Heavy coat, thermal layer, hat, gloves, scarf, warm boots" },
  },
};

function clothingItems(sport: "cycling" | "running" | "walking", band: Band, gender: "male" | "female"): string[] {
  const cell = CLOTHING[sport][band];
  const raw = gender === "female" && cell.f ? cell.f : cell.m;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export default function WeatherAvatar({ tempF, precipProb, windSpeedMph, gender = "male", sport = "cycling" }: WeatherAvatarProps) {
  const band = getBand(tempF);
  const items = clothingItems(sport, band.key, gender);
  const isRainy = precipProb > 0.4;
  const avatarSrc = selectAvatar(tempF, precipProb, windSpeedMph, gender, sport);

  return (
    <div className="card">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-500">
        What to Wear
      </h3>

      <div className="flex gap-5 items-start">
        {/* ── LIVE-MATCHED AVATAR ── */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <div className="rounded-xl bg-[#f5f0e8] p-2 shadow-md">
            <Image
              src={avatarSrc}
              alt={`${sport === "cycling" ? "Cyclist" : sport === "walking" ? "Walker" : "Runner"} outfit for ${Math.round(tempF)}°F${isRainy ? ", rain" : ""}`}
              width={156}
              height={156}
              className="w-[156px] h-[156px] object-contain"
            />
          </div>
          <span className={`mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${band.badge}`}>
            {band.label}{isRainy ? " · Rain" : ""}
          </span>
          <span className="mt-1 text-[11px] text-gray-500">
            {Math.round(tempF)}°F · {band.range}
          </span>
        </div>

        {/* ── GUIDE CLOTHING LIST ── */}
        <div className="flex-1 min-w-0">
          <div className="space-y-1.5">
            {items.map((item) => (
              <div key={item} className="flex items-start gap-2">
                <span className="mt-0.5 text-xs flex-shrink-0 text-sky-400">●</span>
                <span className="text-sm text-gray-200">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
