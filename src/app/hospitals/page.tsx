import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import HospitalsClient from "./HospitalsClient";

export const metadata: Metadata = {
  title: "Nearby Hospitals & Urgent Care",
  description:
    "Find hospitals, urgent care, and clinics near any US ZIP code. Address, phone, and website for the closest 5.",
};

export default async function HospitalsPage() {
  const token = (await cookies()).get("rbw_token")?.value;
  const payload = token ? await verifyToken(token) : null;
  if (!payload) redirect("/login?next=/hospitals");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Nearby Hospitals &amp; Urgent Care
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Enter a US ZIP code to see the 5 closest hospitals, urgent care, and clinics —
          with address, phone, and website.
        </p>
      </div>
      <HospitalsClient />
    </div>
  );
}
