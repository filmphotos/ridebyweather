import type { Metadata } from "next";
import Link from "next/link";
import CheckoutButton from "@/components/Stripe/CheckoutButton";

export const metadata: Metadata = {
  title: "Pricing — RideByWeather",
  description: "Choose a plan that fits your riding. Free, Pro, and Enterprise tiers available.",
};

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with basic cycling weather.",
    features: [
      "Basic Ride Score (current conditions)",
      "Current weather forecast",
      "Gear recommendations",
      "3 saved routes",
      "Mobile PWA access",
    ],
    limitations: [
      "No hourly forecast timeline",
      "No wind-aware routing",
      "No device integrations",
    ],
    cta: "Start Free",
    plan: null as null,
    href: "/signup",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$9",
    period: "per month",
    description: "Advanced wind modeling for serious cyclists.",
    features: [
      "Everything in Free",
      "48-hour forecast timeline",
      "Wind-aware route optimization",
      "Headwind/tailwind per segment",
      "Auto reverse route suggestion",
      "Unlimited saved routes",
      "Garmin & Wahoo push alerts (coming soon)",
      "Strava sync",
      "Historical weather replay",
    ],
    limitations: [],
    cta: "Start 14-Day Free Trial",
    plan: "pro" as const,
    href: null,
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "$49",
    period: "per month",
    description: "For bike shops and cycling clubs.",
    features: [
      "Everything in Pro",
      "Partner listing on the map",
      "Branded route collections",
      "Team accounts (up to 25 riders)",
      "API access",
      "Priority support",
      "Admin analytics dashboard",
    ],
    limitations: [],
    cta: "Contact Sales",
    plan: null as null,
    href: "/contact",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-white">Simple, transparent pricing</h1>
        <p className="mt-4 text-lg text-gray-400">
          Start free. Upgrade when you need wind-aware routing.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`card relative flex flex-col ${
              plan.highlighted
                ? "border-sky-500/50 ring-1 ring-sky-500/30"
                : ""
            }`}
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-sky-500 px-3 py-1 text-xs font-bold text-white">
                MOST POPULAR
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-lg font-bold text-white">{plan.name}</h2>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                <span className="text-gray-500">/ {plan.period}</span>
              </div>
              <p className="mt-2 text-sm text-gray-400">{plan.description}</p>
            </div>

            <ul className="mb-6 flex-1 space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-green-400 mt-0.5">✓</span>
                  {f}
                </li>
              ))}
              {plan.limitations.map((l) => (
                <li key={l} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="mt-0.5">✗</span>
                  {l}
                </li>
              ))}
            </ul>

            {plan.plan ? (
              <CheckoutButton
                plan={plan.plan}
                label={plan.cta}
                className={plan.highlighted ? "btn-primary w-full text-center" : "btn-secondary w-full text-center"}
              />
            ) : (
              <Link
                href={plan.href!}
                className={plan.highlighted ? "btn-primary w-full text-center" : "btn-secondary w-full text-center"}
              >
                {plan.cta}
              </Link>
            )}
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-gray-600">
        All paid plans include a 14-day free trial. No credit card required for Free tier.
        Billing powered by Stripe.
      </p>
    </div>
  );
}
