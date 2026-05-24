"use client";

interface BreakdownItem {
  label: string;
  score: number;
  weight: string;
  icon: string;
}

interface RideScoreBreakdownProps {
  breakdown: {
    wind: number;
    temperature: number;
    precipitation: number;
    gustFactor: number;
    humidity: number;
    windType: string;
    windPercent: number;
  };
}

export default function RideScoreBreakdown({ breakdown }: RideScoreBreakdownProps) {
  const items: BreakdownItem[] = [
    { label: "Wind", score: breakdown.wind, weight: "40%", icon: "🌬️" },
    { label: "Temperature", score: breakdown.temperature, weight: "20%", icon: "🌡️" },
    { label: "Precipitation", score: breakdown.precipitation, weight: "15%", icon: "🌧️" },
    { label: "Gusts", score: breakdown.gustFactor, weight: "10%", icon: "💨" },
    { label: "Humidity", score: breakdown.humidity, weight: "10%", icon: "💧" },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
        Score Breakdown
      </h3>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-lg w-6">{item.icon}</span>
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-300">{item.label}</span>
              <span className="text-gray-500">{item.weight}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-800">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${(item.score / 10) * 100}%`,
                  backgroundColor: barColor(item.score),
                }}
              />
            </div>
          </div>
          <span
            className="text-xs font-bold w-6 text-right tabular-nums"
            style={{ color: barColor(item.score) }}
          >
            {item.score.toFixed(1)}
          </span>
        </div>
      ))}

      {breakdown.windType !== "none" && (
        <div className="mt-3 rounded-lg bg-gray-800/50 px-3 py-2 text-xs text-gray-400">
          {windTypeIcon(breakdown.windType)}{" "}
          <span className="capitalize font-medium text-gray-300">{breakdown.windType}</span>
          {" "}on {breakdown.windPercent}% of route
        </div>
      )}
    </div>
  );
}

function barColor(score: number): string {
  if (score >= 8) return "#22c55e";
  if (score >= 5) return "#eab308";
  if (score >= 3) return "#f97316";
  return "#ef4444";
}

function windTypeIcon(type: string): string {
  if (type === "headwind") return "⬆️";
  if (type === "tailwind") return "⬇️";
  if (type === "crosswind") return "↔️";
  return "";
}
