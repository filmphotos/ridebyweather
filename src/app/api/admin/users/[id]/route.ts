import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminFromRequest } from "@/lib/admin";
import { db } from "@/lib/db";

const PatchSchema = z.object({
  role: z.enum(["user", "admin"]).optional(),
});

async function ensureNotLastAdmin(targetId: string) {
  const adminCount = await db.user.count({ where: { role: "admin" } });
  if (adminCount <= 1) {
    const target = await db.user.findUnique({
      where: { id: targetId },
      select: { role: true },
    });
    if (target?.role === "admin") return false;
  }
  return true;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Block demoting yourself or removing the last remaining admin
  if (parsed.data.role === "user") {
    if (id === admin.id) {
      return NextResponse.json(
        { error: "You can't demote yourself. Ask another admin." },
        { status: 400 }
      );
    }
    const safe = await ensureNotLastAdmin(id);
    if (!safe) {
      return NextResponse.json(
        { error: "Can't remove the last admin." },
        { status: 400 }
      );
    }
  }

  try {
    const updated = await db.user.update({
      where: { id },
      data: parsed.data,
      select: { id: true, email: true, role: true },
    });
    return NextResponse.json({ user: updated });
  } catch (err) {
    console.error("User PATCH error:", err);
    return NextResponse.json({ error: "Could not update user" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  if (id === admin.id) {
    return NextResponse.json(
      { error: "You can't delete your own account from here." },
      { status: 400 }
    );
  }

  // Block deleting the last admin
  const safe = await ensureNotLastAdmin(id);
  if (!safe) {
    return NextResponse.json({ error: "Can't delete the last admin." }, { status: 400 });
  }

  try {
    await db.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("User DELETE error:", err);
    return NextResponse.json({ error: "Could not delete user" }, { status: 500 });
  }
}
