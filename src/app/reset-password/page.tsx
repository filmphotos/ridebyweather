import { Suspense } from "react";
import type { Metadata } from "next";
import ResetPasswordForm from "@/components/Auth/ResetPasswordForm";

export const metadata: Metadata = { title: "Reset password — RideByWeather" };

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
