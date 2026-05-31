import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyToken } from "@/lib/auth";

const QuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

// Open-Meteo air-quality endpoint exposes grass/tree/weed/birch/olive/ragweed
// pollen in grains/m³. Free, no key required.
const OPEN_METEO_AQ = "https://air-quality-api.open-meteo.com/v1/air-quality";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = QuerySchema.safeParse(params);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { lat, lng } = parsed.data;

  try {
    const vars = "grass_pollen,tree_pollen,weed_pollen,birch_pollen,ragweed_pollen,alder_pollen";
    const url = `${OPEN_METEO_AQ}?latitude=${lat}&longitude=${lng}&hourly=${vars}&forecast_days=1&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Pollen fetch failed: ${res.status}`);
    const data = await res.json();

    const h = data.hourly ?? {};
    const grass = avg(h.grass_pollen);
    const tree = avg(h.tree_pollen);
    const weed = avg(h.weed_pollen);
    const birch = avg(h.birch_pollen);
    const ragweed = avg(h.ragweed_pollen);
    const alder = avg(h.alder_pollen);

    // Total pollen score combines the dominant categories.
    const peakGrains = Math.max(grass, tree, weed, birch, ragweed, alder);
    const { level, advice, color } = categorize(peakGrains);

    return NextResponse.json({
      level,
      color,
      advice,
      peakGrains: Math.round(peakGrains),
      breakdown: {
        grass: Math.round(grass),
        tree: Math.round(tree),
        weed: Math.round(weed),
        birch: Math.round(birch),
        ragweed: Math.round(ragweed),
        alder: Math.round(alder),
      },
    });
  } catch (err) {
    console.error("Pollen error:", err);
    return NextResponse.json({ error: "Failed to fetch pollen data" }, { status: 500 });
  }
}

function avg(arr: unknown): number {
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  const nums = arr.filter((n): n is number => typeof n === "number");
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function categorize(grains: number): { level: string; advice: string; color: string } {
  if (grains < 1) return { level: "Low", color: "#22c55e", advice: "Allergy-free riding today. Open windows, deep breaths." };
  if (grains < 20) return { level: "Moderate", color: "#eab308", advice: "Mild symptoms possible. Sensitive riders: take antihistamine before riding." };
  if (grains < 100) return { level: "High", color: "#f97316", advice: "High pollen — eye protection helps. Rinse off after, don't bring it indoors." };
  if (grains < 200) return { level: "Very High", color: "#ef4444", advice: "Very high pollen. Consider trainer day if you're sensitive. Ride at dawn for the lowest counts." };
  return { level: "Extreme", color: "#7f1d1d", advice: "Severe pollen levels. Allergy-sensitive riders should consider an indoor session." };
}
