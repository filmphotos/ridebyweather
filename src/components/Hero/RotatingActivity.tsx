"use client";

import { useEffect, useState } from "react";

const ACTIVITIES = ["Cycling", "Running"] as const;

export default function RotatingActivity() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % ACTIVITIES.length);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="relative inline-grid align-bottom overflow-hidden h-[1.25em] leading-[1.1]">
      {ACTIVITIES.map((word, i) => (
        <span
          key={word}
          aria-hidden={i !== index}
          className="col-start-1 row-start-1 whitespace-nowrap transition-all duration-500 ease-out"
          style={{
            transform: `translateY(${(i - index) * 100}%)`,
            opacity: i === index ? 1 : 0,
          }}
        >
          {word}
        </span>
      ))}
    </span>
  );
}
