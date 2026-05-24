import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Welcome to Pro — RideByWeather" };

export default function UpgradeSuccessPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="card max-w-md w-full space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-500/20">
          <svg className="h-8 w-8 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-white">You&apos;re all set!</h1>
          <p className="mt-2 text-gray-400">
            Your 14-day Pro trial has started. You now have full access to wind-aware routing,
            the 48-hour forecast timeline, and all Pro features.
          </p>
        </div>

        <div className="rounded-lg bg-sky-500/10 border border-sky-500/20 p-4 text-sm text-sky-300 space-y-1 text-left">
          <p className="font-semibold text-sky-400">What&apos;s unlocked:</p>
          <ul className="space-y-1 mt-2">
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span> 48-hour forecast timeline</li>
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Headwind / tailwind per route segment</li>
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Auto reverse-route suggestions</li>
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Unlimited saved routes</li>
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Garmin &amp; Wahoo push alerts</li>
          </ul>
        </div>

        <Link href="/cycling" className="btn-primary w-full text-center block">
          Go to Dashboard
        </Link>

        <p className="text-xs text-gray-600">
          You&apos;ll receive a confirmation email shortly. Manage billing any time from your account settings.
        </p>
      </div>
    </div>
  );
}
