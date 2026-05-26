import type { Metadata } from "next";
import ForgotPasswordForm from "@/components/Auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Forgot password — RideByWeather" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
