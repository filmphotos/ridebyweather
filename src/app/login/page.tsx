import type { Metadata } from "next";
import AuthForm from "@/components/Auth/AuthForm";

export const metadata: Metadata = { title: "Log In — RideByWeather" };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
