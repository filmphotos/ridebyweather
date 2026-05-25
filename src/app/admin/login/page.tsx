import type { Metadata } from "next";
import AdminLoginForm from "./AdminLoginForm";

export const metadata: Metadata = { title: "Admin Login — RideByWeather" };

export default function AdminLoginPage() {
  return <AdminLoginForm />;
}
