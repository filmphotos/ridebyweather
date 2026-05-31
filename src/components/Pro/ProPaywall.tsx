"use client";

import Link from "next/link";

interface Props {
  feature: string;
  // Optional short blurb expanding on what the feature does. Shown under
  // the headline. If omitted, the headline stands alone.
  description?: string;
  // Optional "you have X / Pro gives Y" line, e.g. "Free includes 1 spot
  // — Pro gives you up to 10."
  limitLine?: string;
}

// Drop-in upsell card. Use anywhere a free user hits a Pro feature: route
// pages, multi-spot scanner, 14-day forecast view, etc. Keeps the gate
// message + CTA visually consistent so users learn what Pro unlocks.
export default function ProPaywall({ feature, description, limitLine }: Props) {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-amber-500/0 p-6 text-center">
      <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
        <span aria-hidden>★</span> Pro feature
      </div>
      <h3 className="mt-4 text-lg font-bold text-white">{feature}</h3>
      {description && (
        <p className="mt-2 text-sm text-gray-400 max-w-md mx-auto">{description}</p>
      )}
      {limitLine && (
        <p className="mt-2 text-xs text-amber-300/80">{limitLine}</p>
      )}
      <Link
        href="/pricing"
        className="mt-5 inline-flex items-center rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-gray-900 hover:bg-amber-400 transition-colors"
      >
        Upgrade to Pro — $9/mo
      </Link>
      <p className="mt-3 text-[11px] text-gray-500">14-day free trial · cancel anytime</p>
    </div>
  );
}
