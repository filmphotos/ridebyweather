import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";
import { db } from "@/lib/db";

// Community-confirm a report ("yes, it's still there").
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.roadClosure.findUnique({ where: { id } });
  if (!existing || existing.status !== "active") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const updated = await db.roadClosure.update({
    where: { id },
    data: { confirmations: { increment: 1 } },
    select: { id: true, confirmations: true },
  });
  return NextResponse.json({ closure: updated });
}

// Reporter clears their own report once the road is open again.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await db.roadClosure.deleteMany({
    where: { id, userId: payload.userId },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
