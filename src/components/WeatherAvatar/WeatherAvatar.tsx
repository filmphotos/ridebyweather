"use client";

interface WeatherAvatarProps {
  tempF: number;
  precipProb: number;
  windSpeedMph: number;
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

function buildGearList(tempF: number, precipProb: number, windSpeedMph: number): GearItem[] {
  const isRainy = precipProb > 0.4;
  const isWindy = windSpeedMph > 15;
  const items: GearItem[] = [];

  // Base
  if (tempF < 50) {
    items.push({ item: "Thermal base layer", reason: `${Math.round(tempF)}°F — insulation needed`, required: true, category: "base" });
  } else {
    items.push({ item: "Cycling jersey", reason: tempF >= 70 ? "Warm weather — moisture wicking" : "Standard base layer", required: true, category: "base" });
  }
  // Layers
  if (isRainy) {
    items.push({ item: "Waterproof rain jacket", reason: `${Math.round(precipProb * 100)}% rain probability`, required: precipProb > 0.6, category: "layer" });
  } else if (tempF < 50) {
    items.push({ item: "Insulated cycling jacket", reason: "Below 50°F — full insulation", required: true, category: "layer" });
  } else if (tempF < 60) {
    items.push({ item: "Arm warmers", reason: `${Math.round(tempF)}°F — core stays warm`, required: false, category: "layer" });
    if (isWindy) items.push({ item: "Wind vest", reason: `${Math.round(windSpeedMph)} mph wind chill`, required: false, category: "layer" });
  } else if (isWindy && tempF < 72) {
    items.push({ item: "Wind vest", reason: `${Math.round(windSpeedMph)} mph headwind`, required: false, category: "layer" });
  }
  // Legs
  if (tempF < 40) {
    items.push({ item: "Thermal tights", reason: "Below 40°F — full leg insulation", required: true, category: "legs" });
  } else if (tempF < 55) {
    items.push({ item: "Leg warmers", reason: `${Math.round(tempF)}°F — legs need coverage`, required: tempF < 48, category: "legs" });
  }
  // Accessories
  if (tempF < 55) {
    items.push({ item: "Cycling gloves", reason: tempF < 40 ? "Full fingered — near freezing" : "Cold hands impair braking", required: tempF < 45, category: "accessory" });
  }
  if (tempF < 50 || isRainy) {
    items.push({ item: "Shoe covers", reason: isRainy ? "Waterproof overshoes" : "Foot warmth critical", required: tempF < 40 || (isRainy && tempF < 55), category: "accessory" });
  }
  if (!isRainy) {
    items.push({ item: "Sunglasses", reason: "Eye protection & wind shield", required: false, category: "accessory" });
  }
  items.push({ item: "Helmet", reason: "Always required", required: true, category: "accessory" });

  return items;
}

export default function WeatherAvatar({ tempF, precipProb, windSpeedMph }: WeatherAvatarProps) {
  const o = getOutfit(tempF, precipProb, windSpeedMph);
  const gear = buildGearList(tempF, precipProb, windSpeedMph);
  const isRainy = precipProb > 0.4;

  const skinColor = "#c9956e";
  const bikeColor = "#6b7280";
  const bikeStroke = "#374151";

  // Torso fill: outermost layer wins
  const torsoColor = o.rainJacket
    ? "#ca8a04"
    : o.jacket
    ? "#1e3a5f"
    : o.jerseyColor;

  // Arm fill
  const armColor = o.rainJacket
    ? "#ca8a04"
    : o.jacket
    ? "#1e3a5f"
    : o.armWarmers
    ? "#374151"
    : skinColor;

  // Leg fill (near leg)
  const legColor = o.tights ? "#111827" : o.legWarmers ? "#1f2937" : skinColor;
  const thighColor = o.tights ? "#111827" : "#111827"; // bib shorts always dark

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
        {/* ── SVG CYCLIST AVATAR ── */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <svg viewBox="0 0 200 172" width="156" height="134">
            {/* Rain drops */}
            {isRainy && (
              <g opacity="0.35" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round">
                <line x1="22" y1="8" x2="19" y2="22" />
                <line x1="58" y1="4" x2="55" y2="18" />
                <line x1="96" y1="6" x2="93" y2="20" />
                <line x1="170" y1="5" x2="167" y2="19" />
                <line x1="40" y1="14" x2="37" y2="28" />
                <line x1="130" y1="10" x2="127" y2="24" />
              </g>
            )}

            {/* ── BIKE ── */}
            {/* Rear wheel */}
            <circle cx="48" cy="140" r="28" fill="none" stroke={bikeStroke} strokeWidth="3.5" />
            <circle cx="48" cy="140" r="4" fill="#4b5563" />
            {/* Front wheel */}
            <circle cx="158" cy="140" r="28" fill="none" stroke={bikeStroke} strokeWidth="3.5" />
            <circle cx="158" cy="140" r="4" fill="#4b5563" />
            {/* Simplified spokes */}
            {[0, 60, 120].map((angle) => {
              const rad = (angle * Math.PI) / 180;
              return (
                <g key={angle}>
                  <line x1={48 + 28 * Math.cos(rad)} y1={140 + 28 * Math.sin(rad)} x2={48 - 28 * Math.cos(rad)} y2={140 - 28 * Math.sin(rad)} stroke={bikeStroke} strokeWidth="1" />
                  <line x1={158 + 28 * Math.cos(rad)} y1={140 + 28 * Math.sin(rad)} x2={158 - 28 * Math.cos(rad)} y2={140 - 28 * Math.sin(rad)} stroke={bikeStroke} strokeWidth="1" />
                </g>
              );
            })}
            {/* Chain stay */}
            <line x1="48" y1="140" x2="100" y2="122" stroke={bikeColor} strokeWidth="4" strokeLinecap="round" />
            {/* Seat stay */}
            <line x1="48" y1="140" x2="88" y2="84" stroke={bikeColor} strokeWidth="3" strokeLinecap="round" />
            {/* Seat tube */}
            <line x1="88" y1="84" x2="100" y2="122" stroke={bikeColor} strokeWidth="4" strokeLinecap="round" />
            {/* Top tube */}
            <line x1="88" y1="84" x2="143" y2="80" stroke={bikeColor} strokeWidth="4" strokeLinecap="round" />
            {/* Down tube */}
            <line x1="100" y1="122" x2="143" y2="80" stroke={bikeColor} strokeWidth="4" strokeLinecap="round" />
            {/* Fork */}
            <line x1="143" y1="80" x2="158" y2="140" stroke={bikeColor} strokeWidth="4" strokeLinecap="round" />
            {/* Chain ring */}
            <circle cx="100" cy="122" r="10" fill="none" stroke="#9ca3af" strokeWidth="2.5" />
            <circle cx="100" cy="122" r="3" fill="#6b7280" />
            {/* Saddle */}
            <rect x="74" y="76" width="20" height="5" rx="2.5" fill="#1f2937" stroke="#4b5563" strokeWidth="1" />
            <line x1="84" y1="80" x2="88" y2="85" stroke={bikeColor} strokeWidth="2" />
            {/* Handlebar drops */}
            <path d="M143,80 Q148,80 150,85 Q150,94 153,96" fill="none" stroke={bikeColor} strokeWidth="3" strokeLinecap="round" />

            {/* ── FAR LEG (recovery stroke) ── */}
            <path d="M89,82 Q94,100 91,113" fill="none" stroke={thighColor} strokeWidth="9" strokeLinecap="round" opacity="0.65" />
            <path d="M91,113 Q96,127 100,138" fill="none" stroke={legColor === skinColor ? "#a07850" : legColor} strokeWidth="7" strokeLinecap="round" opacity="0.65" />
            <path d="M100,138 Q106,141 113,139" fill="none" stroke="#0f172a" strokeWidth="6" strokeLinecap="round" opacity="0.65" />

            {/* ── NEAR LEG (power stroke) ── */}
            {/* Thigh (bib shorts always) */}
            <path d="M88,82 Q74,100 70,115" fill="none" stroke={thighColor} strokeWidth="10" strokeLinecap="round" />
            {/* Lower leg */}
            <path d="M70,115 Q62,130 56,140" fill="none" stroke={legColor} strokeWidth="8" strokeLinecap="round" />
            {/* Shoe */}
            <path d="M56,140 Q65,144 76,142" fill="none" stroke="#111827" strokeWidth="7" strokeLinecap="round" />
            {/* Overshoe accent */}
            {o.overshoes && (
              <path d="M56,141 Q65,145 76,143" fill="none" stroke="#1e40af" strokeWidth="3" strokeLinecap="round" />
            )}

            {/* ── TORSO ── */}
            <path
              d="M88,82 Q100,70 142,60 Q150,60 150,73 Q136,84 88,89 Z"
              fill={torsoColor}
            />
            {/* Vest overlay (shows on top of jersey if vest, no jacket) */}
            {o.vest && !o.jacket && !o.rainJacket && (
              <path
                d="M95,80 Q104,72 132,63 Q138,63 140,69 Q128,77 95,85 Z"
                fill="#374151"
                opacity="0.85"
              />
            )}

            {/* ── ARMS ── */}
            {/* Upper arm */}
            <path d="M144,63 Q148,70 150,77" fill="none" stroke={armColor} strokeWidth="9" strokeLinecap="round" />
            {/* Forearm */}
            <path d="M150,77 Q152,84 153,90" fill="none" stroke={armColor} strokeWidth="7" strokeLinecap="round" />
            {/* Glove */}
            {o.gloves ? (
              <circle cx="153" cy="92" r="4.5" fill="#111827" stroke="#374151" strokeWidth="1" />
            ) : (
              <circle cx="153" cy="92" r="4" fill={skinColor} />
            )}

            {/* ── NECK ── */}
            <line x1="148" y1="57" x2="149" y2="63" stroke={skinColor} strokeWidth="5" strokeLinecap="round" />

            {/* ── HEAD ── */}
            <circle cx="149" cy="45" r="13" fill={skinColor} />

            {/* ── HELMET ── */}
            <path
              d="M137,45 Q137,27 149,25 Q161,27 161,45"
              fill={o.helmetColor}
              stroke={o.helmetStroke}
              strokeWidth="1"
            />
            {/* Vents */}
            <line x1="141" y1="32" x2="142" y2="40" stroke={o.helmetStroke} strokeWidth="1.5" />
            <line x1="149" y1="29" x2="149" y2="37" stroke={o.helmetStroke} strokeWidth="1.5" />
            <line x1="157" y1="32" x2="156" y2="40" stroke={o.helmetStroke} strokeWidth="1.5" />
            {/* Strap */}
            <path d="M137,45 Q141,51 149,53 Q157,51 161,45" fill="none" stroke={o.helmetStroke} strokeWidth="1" />

            {/* ── SUNGLASSES ── */}
            {o.sunglasses && (
              <g>
                <ellipse cx="144" cy="47" rx="5" ry="3.5" fill="#0f172a" opacity="0.85" />
                <ellipse cx="154" cy="47" rx="5" ry="3.5" fill="#0f172a" opacity="0.85" />
                <line x1="149" y1="47" x2="149" y2="47" stroke="#374151" strokeWidth="1" />
                <line x1="139" y1="47" x2="136" y2="46" stroke="#374151" strokeWidth="1.2" />
                <line x1="159" y1="47" x2="162" y2="46" stroke="#374151" strokeWidth="1.2" />
              </g>
            )}
          </svg>

          <span className={`mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${conditionClass}`}>
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
