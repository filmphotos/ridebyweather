import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

async function loadAdminFromToken(token: string | undefined): Promise<AdminUser | null> {
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function getAdminFromRequest(req: NextRequest): Promise<AdminUser | null> {
  return loadAdminFromToken(req.cookies.get("rbw_token")?.value);
}

export async function getAdminFromCookies(): Promise<AdminUser | null> {
  const store = await cookies();
  return loadAdminFromToken(store.get("rbw_token")?.value);
}
