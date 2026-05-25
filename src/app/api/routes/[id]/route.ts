import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

async function getPayload(req: NextRequest) {
  const token = req.cookies.get("rbw_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = await getPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const route = await db.route.findUnique({ where: { id } });
  if (!route || route.userId !== payload.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.route.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
