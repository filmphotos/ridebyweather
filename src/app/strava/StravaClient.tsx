"use client";

import { useState } from "react";

interface Props {
  enabled: boolean;
  clientId: string;
}

export default function StravaClient({ enabled, clientId }: Props) {
  const [notice, setNotice] = useState<string | null>(null);

  const connect = () => {
    if (!enabled) {
      setNotice("Strava integration is configured but not yet active for this environment. Please check back soon.");
      return;
    }
    const redirect = `${window.location.origin}/strava/callback`;
    const scope = "read,activity:read";
    const url = `https://www.strava.com/oauth/authorize?client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(redirect)}&scope=${encodeURIComponent(scope)}&approval_prompt=auto`;
    window.location.href = url;
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Connect Strava</h1>
        <p className="mt-1 text-sm text-gray-400 max-w-xl">
          Import your last 90 days of rides and we&apos;ll retune your Ride Score thresholds to
          match your actual tolerance. A 25 mph headwind hurts a touring rider differently than
          a TT specialist.
        </p>
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">What we read</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-gray-300">
          <li>✓ Your last 90 days of activities (distance, time, avg speed, elevation)</li>
          <li>✓ Activity type — cycling, running, gravel, MTB</li>
          <li>✗ No private notes, photos, or kudos data</li>
          <li>✗ Nothing is shared back to your Strava profile</li>
        </ul>
      </div>

      <div className="mt-6 card">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">What it personalizes</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-gray-300">
          <li>• Wind tolerance — based on your typical riding pace and effort distribution</li>
          <li>• Temperature comfort band — inferred from the conditions you actually ride in</li>
          <li>• Distance defaults for the route forecaster and best-window scanner</li>
          <li>• Per-sport Ride Score weightings if you ride more than one discipline</li>
        </ul>
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          onClick={connect}
          className="inline-flex items-center gap-2 rounded-lg bg-[#FC4C02] px-5 py-3 text-sm font-bold text-white hover:bg-[#e54400]"
        >
          Connect with Strava
        </button>
        {!enabled && (
          <p className="max-w-md text-center text-xs text-gray-500">
            Powered by the Strava API. The OAuth handshake is wired and ready — we&apos;ll switch
            it on the moment our v3 app submission clears review.
          </p>
        )}
        {notice && (
          <p className="max-w-md text-center text-xs text-amber-300">{notice}</p>
        )}
      </div>
    </div>
  );
}
