import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  // Scope the delete to the owner so one user can't remove another's contact.
  const result = await db.emergencyContact.deleteMany({
    where: { id, userId: payload.userId },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
