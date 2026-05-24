import type { Metadata } from "next";
import AuthForm from "@/components/Auth/AuthForm";

export const metadata: Metadata = { title: "Sign Up — RideByWeather" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  return <AuthForm mode="signup" plan={plan} />;
}
