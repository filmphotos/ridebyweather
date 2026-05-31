"use client";

import { useEffect, useMemo, useState } from "react";

export default function ReferralsClient({ userId }: { userId: string }) {
  const code = useMemo(() => buildCode(userId), [userId]);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const link = origin ? `${origin}/signup?ref=${code}` : `/signup?ref=${code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const share = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "RideByWeather",
          text: "Ride smarter. Get a free Pro month — join with my link:",
          url: link,
        });
      } catch {}
    } else {
      copy();
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Refer a friend, both get Pro free</h1>
        <p className="mt-1 text-sm text-gray-400 max-w-xl">
          Share your link. When your friend creates an account, you both get a free month of Pro
          on us.
        </p>
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Your invite link</h2>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2">
          <code className="flex-1 truncate text-sm text-gray-200">{link}</code>
          <button onClick={copy} className="btn-secondary px-3 py-1 text-xs">
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={share} className="btn-primary flex-1">Share</button>
          <a
            href={`mailto:?subject=${encodeURIComponent("Ride smarter with RideByWeather")}&body=${encodeURIComponent("Try this — Ride Score, wind routing, the whole kit. Free month of Pro for both of us if you sign up: " + link)}`}
            className="btn-secondary flex-1 text-center"
          >
            Email
          </a>
        </div>
      </div>

      <div className="mt-6 card">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">How it works</h2>
        <ol className="mt-3 space-y-2 text-sm text-gray-300">
          <li className="flex gap-3">
            <span className="text-sky-400 font-bold">1.</span>
            Send your link to a riding friend.
          </li>
          <li className="flex gap-3">
            <span className="text-sky-400 font-bold">2.</span>
            They sign up — your code is automatically applied.
          </li>
          <li className="flex gap-3">
            <span className="text-sky-400 font-bold">3.</span>
            You both get a free month of Pro the first time they upgrade.
          </li>
        </ol>
        <p className="mt-4 text-[11px] text-gray-500">
          Credit issuance launches with the next billing release. Your code is recorded against
          signups now so you don&apos;t miss earned credit when it goes live.
        </p>
      </div>
    </div>
  );
}

function buildCode(userId: string): string {
  // Short, stable, URL-safe slug derived from the user id.
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  const base = Math.abs(hash).toString(36);
  return ("RBW" + base.toUpperCase()).slice(0, 9);
}
