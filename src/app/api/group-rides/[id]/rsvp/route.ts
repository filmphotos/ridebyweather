import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

const RsvpSchema = z.object({
  status: z.enum(["going", "maybe"]),
});

async function getPayload(req: NextRequest) {
  const token = req.cookies.get("rbw_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = await getPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = RsvpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const ride = await db.groupRide.findUnique({
    where: { id },
    include: { _count: { select: { participants: true } } },
  });
  if (!ride) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await db.groupRideParticipant.findUnique({
    where: { groupRideId_userId: { groupRideId: id, userId: payload.userId } },
  });

  if (!existing && ride.maxRiders && ride._count.participants >= ride.maxRiders) {
    return NextResponse.json({ error: "Ride is full" }, { status: 409 });
  }

  const rsvp = await db.groupRideParticipant.upsert({
    where: { groupRideId_userId: { groupRideId: id, userId: payload.userId } },
    create: { groupRideId: id, userId: payload.userId, status: parsed.data.status },
    update: { status: parsed.data.status },
  });

  return NextResponse.json({ rsvp: { status: rsvp.status } });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = await getPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ride = await db.groupRide.findUnique({ where: { id } });
  if (!ride) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Creator cannot leave their own ride (must delete the ride instead)
  if (ride.creatorId === payload.userId) {
    return NextResponse.json({ error: "Creator must cancel the ride to leave" }, { status: 400 });
  }

  await db.groupRideParticipant.deleteMany({
    where: { groupRideId: id, userId: payload.userId },
  });

  return NextResponse.json({ ok: true });
}
