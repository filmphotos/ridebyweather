import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthPayload } from "@/lib/auth";
import { db } from "@/lib/db";

const CreateSchema = z
  .object({
    name: z.string().min(1).max(80),
    relation: z.string().max(40).optional().nullable(),
    email: z.string().email().optional().nullable(),
    phone: z.string().max(40).optional().nullable(),
  })
  .refine((d) => !!d.email || !!d.phone, {
    message: "Provide an email or a phone number",
  });

export async function GET(req: NextRequest) {
  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contacts = await db.emergencyContact.findMany({
    where: { userId: payload.userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, relation: true, email: true, phone: true },
  });
  return NextResponse.json({ contacts });
}

export async function POST(req: NextRequest) {
  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  const count = await db.emergencyContact.count({ where: { userId: payload.userId } });
  if (count >= 10) {
    return NextResponse.json({ error: "You can save up to 10 emergency contacts" }, { status: 400 });
  }

  const contact = await db.emergencyContact.create({
    data: {
      userId: payload.userId,
      name: d.name,
      relation: d.relation ?? null,
      email: d.email ?? null,
      phone: d.phone ?? null,
    },
    select: { id: true, name: true, relation: true, email: true, phone: true },
  });
  return NextResponse.json({ contact }, { status: 201 });
}
