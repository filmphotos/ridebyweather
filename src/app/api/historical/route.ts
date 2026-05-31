import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyToken } from "@/lib/auth";

const QuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  // Year offset — 1 = last year, 2 = two years ago. We aggregate 1..5.
});

// Open-Meteo archive: free, no key. Returns daily aggregates for any past date.
const ARCHIVE = "https://archive-api.open-meteo.com/v1/archive";

interface YearRow {
  year: number;
  tempMaxF: number | null;
  tempMinF: number | null;
  windMaxMph: number | null;
  precipInch: number | null;
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { lat, lng } = parsed.data;

  const today = new Date();
  const month = String(today.getUTCMonth() + 1).padStart(2, "0");
  const day = String(today.getUTCDate()).padStart(2, "0");

  try {
    const years: YearRow[] = [];
    const promises: Promise<YearRow | null>[] = [];
    for (let back = 1; back <= 5; back++) {
      const y = today.getUTCFullYear() - back;
      promises.push(fetchYear(lat, lng, y, month, day));
    }
    const settled = await Promise.all(promises);
    for (const r of settled) if (r) years.push(r);

    // Compute 5-year mean for the same date.
    const meanTempMax = mean(years.map((y) => y.tempMaxF).filter(isNum));
    const meanTempMin = mean(years.map((y) => y.tempMinF).filter(isNum));
    const meanWind = mean(years.map((y) => y.windMaxMph).filter(isNum));
    const meanPrecip = mean(years.map((y) => y.precipInch).filter(isNum));

    return NextResponse.json({
      date: `${month}-${day}`,
      years,
      mean: {
        tempMaxF: meanTempMax,
        tempMinF: meanTempMin,
        windMaxMph: meanWind,
        precipInch: meanPrecip,
      },
    });
  } catch (err) {
    console.error("Historical error:", err);
    return NextResponse.json({ error: "Failed to fetch historical data" }, { status: 500 });
  }
}

async function fetchYear(lat: number, lng: number, year: number, month: string, day: string): Promise<YearRow | null> {
  const date = `${year}-${month}-${day}`;
  const vars = "temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_sum";
  const url = `${ARCHIVE}?latitude=${lat}&longitude=${lng}&start_date=${date}&end_date=${date}&daily=${vars}&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { year, tempMaxF: null, tempMinF: null, windMaxMph: null, precipInch: null };
    const data = await res.json();
    const d = data.daily;
    return {
      year,
      tempMaxF: typeof d.temperature_2m_max?.[0] === "number" ? d.temperature_2m_max[0] : null,
      tempMinF: typeof d.temperature_2m_min?.[0] === "number" ? d.temperature_2m_min[0] : null,
      windMaxMph: typeof d.wind_speed_10m_max?.[0] === "number" ? d.wind_speed_10m_max[0] : null,
      precipInch: typeof d.precipitation_sum?.[0] === "number" ? d.precipitation_sum[0] : null,
    };
  } catch {
    return null;
  }
}

function isNum(n: number | null): n is number { return typeof n === "number"; }
function mean(arr: number[]): number | null {
  if (arr.length === 0) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
