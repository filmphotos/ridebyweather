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

interface GearItem {
  item: string;
  reason: string;
  required: boolean;
  category: "base" | "layer" | "legs" | "accessory";
}

function getOutfit(tempF: number, precipProb: number, windSpeedMph: number) {
  const isRainy = precipProb > 0.4;
  const isWindy = windSpeedMph > 15;
  return {
    // Base
    thermalBase: tempF < 50,
    // Torso layers
    armWarmers: tempF < 60 && !( tempF < 45),
    vest: (tempF >= 50 && tempF < 65) || (isWindy && tempF < 72 && tempF >= 55),
    jacket: tempF < 50 && !isRainy,
    rainJacket: isRainy,
    // Legs
    legWarmers: tempF < 55 && tempF >= 40,
    tights: tempF < 40,
    // Accessories
    gloves: tempF < 55,
    overshoes: tempF < 50 || isRainy,
    sunglasses: !isRainy && precipProb < 0.3,
    // Colors
    jerseyColor: tempF >= 70 ? "#0ea5e9" : tempF >= 55 ? "#16a34a" : "#2563eb",
    helmetColor: isRainy ? "#facc15" : "#e5e7eb",
    helmetStroke: isRainy ? "#f59e0b" : "#9ca3af",
  };
}

function buildGearList(tempF: number, precipProb: number, windSpeedMph: number, sport: "cycling" | "running" | "walking"): GearItem[] {
  const isRainy = precipProb > 0.4;
  const isWindy = windSpeedMph > 15;
  // Walking shares running's gear logic (no helmet, lighter layers).
  const isRun = sport === "running" || sport === "walking";
  const items: GearItem[] = [];

  // Base
  if (tempF < 50) {
    items.push({ item: "Thermal base layer", reason: `${Math.round(tempF)}°F — insulation needed`, required: true, category: "base" });
  } else {
    items.push({
      item: isRun ? "Technical running shirt" : "Cycling jersey",
      reason: tempF >= 70 ? "Warm weather — moisture wicking" : "Standard base layer",
      required: true,
      category: "base",
    });
  }
  // Layers
  if (isRainy) {
    items.push({ item: "Waterproof rain jacket", reason: `${Math.round(precipProb * 100)}% rain probability`, required: precipProb > 0.6, category: "layer" });
  } else if (tempF < 50) {
    items.push({
      item: isRun ? "Insulated running jacket" : "Insulated cycling jacket",
      reason: "Below 50°F — full insulation",
      required: true,
      category: "layer",
    });
  } else if (tempF < 60) {
    items.push({ item: "Arm warmers", reason: `${Math.round(tempF)}°F — core stays warm`, required: false, category: "layer" });
    if (isWindy) items.push({ item: "Wind vest", reason: `${Math.round(windSpeedMph)} mph wind chill`, required: false, category: "layer" });
  } else if (isWindy && tempF < 72) {
    items.push({ item: "Wind vest", reason: `${Math.round(windSpeedMph)} mph headwind`, required: false, category: "layer" });
  }
  // Legs
  if (tempF < 40) {
    items.push({
      item: isRun ? "Thermal running tights" : "Thermal tights",
      reason: "Below 40°F — full leg insulation",
      required: true,
      category: "legs",
    });
  } else if (tempF < 55) {
    items.push({
      item: isRun ? "Running tights" : "Leg warmers",
      reason: `${Math.round(tempF)}°F — legs need coverage`,
      required: tempF < 48,
      category: "legs",
    });
  }
  // Accessories
  if (tempF < 55) {
    items.push({
      item: isRun ? "Running gloves" : "Cycling gloves",
      reason: tempF < 40 ? "Full fingered — near freezing" : isRun ? "Hands lose heat quickly" : "Cold hands impair braking",
      required: tempF < 45,
      category: "accessory",
    });
  }
  if (isRun) {
    if (tempF < 40) {
      items.push({ item: "Beanie / ear warmers", reason: "Most body heat lost from head", required: tempF < 35, category: "accessory" });
    } else if (tempF >= 70) {
      items.push({ item: "Visor or cap", reason: "Sun & sweat shield", required: false, category: "accessory" });
    }
  } else {
    if (tempF < 50 || isRainy) {
      items.push({ item: "Shoe covers", reason: isRainy ? "Waterproof overshoes" : "Foot warmth critical", required: tempF < 40 || (isRainy && tempF < 55), category: "accessory" });
    }
  }
  if (!isRainy) {
    items.push({ item: "Sunglasses", reason: "Eye protection & wind shield", required: false, category: "accessory" });
  }
  if (!isRun) {
    items.push({ item: "Helmet", reason: "Always required", required: true, category: "accessory" });
  }

  return items;
}

export default function WeatherAvatar({ tempF, precipProb, windSpeedMph, gender = "male", sport = "cycling" }: WeatherAvatarProps) {
  const gear = buildGearList(tempF, precipProb, windSpeedMph, sport);
  const isRainy = precipProb > 0.4;
  const avatarSrc = selectAvatar(tempF, precipProb, windSpeedMph, gender, sport);

  const conditionLabel =
    tempF < 40 ? "Very Cold" : tempF < 55 ? "Cold" : tempF < 68 ? "Mild" : tempF < 80 ? "Warm" : "Hot";

  const conditionClass =
    tempF < 40 ? "bg-blue-900/50 text-blue-300" :
    tempF < 55 ? "bg-blue-800/40 text-blue-400" :
    tempF < 68 ? "bg-green-900/40 text-green-400" :
    tempF < 80 ? "bg-yellow-900/40 text-yellow-400" :
    "bg-orange-900/40 text-orange-400";

  const categoryLabels: Record<string, string> = {
    base: "Base Layer",
    layer: "Outer Layer",
    legs: "Legs",
    accessory: "Accessories",
  };

  const grouped = gear.reduce<Record<string, GearItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

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
              alt={`${sport === "running" ? "Runner" : "Cyclist"} outfit for ${Math.round(tempF)}°F${isRainy ? ", rain" : ""}`}
              width={156}
              height={156}
              className="w-[156px] h-[156px] object-contain"
            />
          </div>
          <span className={`mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${conditionClass}`}>
            {conditionLabel}{isRainy ? " · Rain" : ""}
          </span>
        </div>
        {/* ── GEAR LIST ── */}
        <div className="flex-1 space-y-3 min-w-0">
          {(["base", "layer", "legs", "accessory"] as const).map((cat) => {
            const items = grouped[cat];
            if (!items?.length) return null;
            return (
              <div key={cat}>
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                  {categoryLabels[cat]}
                </div>
                <div className="space-y-1">
                  {items.map((g) => (
                    <div key={g.item} className="flex items-start gap-2">
                      <span className={`mt-0.5 text-xs flex-shrink-0 ${g.required ? "text-sky-400" : "text-gray-600"}`}>
                        {g.required ? "●" : "○"}
                      </span>
                      <div className="min-w-0">
                        <span className={`text-xs font-medium ${g.required ? "text-gray-200" : "text-gray-500"}`}>
                          {g.item}
                        </span>
                        <span className="text-xs text-gray-600 ml-1.5">{g.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex gap-3 text-xs text-gray-700">
        <span>● Required</span>
        <span>○ Recommended</span>
      </div>
    </div>
  );
}
