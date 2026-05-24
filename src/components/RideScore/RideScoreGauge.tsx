"use client";

import { cn } from "@/lib/utils";

interface RideScoreGaugeProps {
  score: number;
  label: string;
  hexColor: string;
  explanation: string;
  size?: "sm" | "md" | "lg";
}

export default function RideScoreGauge({
  score,
  label,
  hexColor,
  explanation,
  size = "md",
}: RideScoreGaugeProps) {
  const radius = size === "lg" ? 72 : size === "sm" ? 40 : 56;
  const strokeWidth = size === "lg" ? 8 : 6;
  const circumference = 2 * Math.PI * radius;
  // Arc covers 270° (3/4 of circle)
  const arcLength = circumference * 0.75;
  const filled = arcLength * (score / 10);
  const gap = arcLength - filled;

  const sizePx = (radius + strokeWidth) * 2;

  return (
    <div className={cn("flex flex-col items-center gap-3", size === "lg" ? "gap-4" : "gap-2")}>
      <div className="relative" style={{ width: sizePx, height: sizePx }}>
        <svg
          width={sizePx}
          height={sizePx}
          viewBox={`0 0 ${sizePx} ${sizePx}`}
          className="rotate-[135deg]"
        >
          {/* Background track */}
          <circle
            cx={sizePx / 2}
            cy={sizePx / 2}
            r={radius}
            fill="none"
            stroke="#1f2937"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference - arcLength}`}
            strokeLinecap="round"
          />
          {/* Score fill */}
          <circle
            cx={sizePx / 2}
            cy={sizePx / 2}
            r={radius}
            fill="none"
            stroke={hexColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${filled} ${gap + (circumference - arcLength)}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.6s ease, stroke 0.4s ease" }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center -rotate-0">
          <span
            className={cn(
              "font-black tabular-nums leading-none",
              size === "lg" ? "text-5xl" : size === "sm" ? "text-2xl" : "text-4xl"
            )}
            style={{ color: hexColor }}
          >
            {score.toFixed(1)}
          </span>
          <span
            className={cn(
              "font-bold tracking-widest uppercase mt-1",
              size === "lg" ? "text-sm" : "text-xs"
            )}
            style={{ color: hexColor }}
          >
            {label}
          </span>
        </div>
      </div>

      <p className={cn("text-center text-gray-400", size === "lg" ? "text-sm" : "text-xs")}>
        {explanation}
      </p>
    </div>
  );
}
