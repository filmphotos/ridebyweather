import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

const Schema = z.object({ endpoint: z.string().url() });

export async function POST(req: NextRequest) {
  const token = req.cookies.get("rbw_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await db.pushSubscription.deleteMany({
    where: { endpoint: parsed.data.endpoint, userId: payload.userId },
  });

  return NextResponse.json({ ok: true });
}
