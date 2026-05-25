import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/admin";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 200);

  const where = q
    ? { OR: [{ email: { contains: q } }, { name: { contains: q } }] }
    : undefined;

  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      subscription: { select: { tier: true, status: true, currentPeriodEnd: true } },
    },
  });

  return NextResponse.json({ users });
}
