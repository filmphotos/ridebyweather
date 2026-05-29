import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthPayload } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail, sosEmail } from "@/lib/email";
import { appOrigin } from "@/lib/appUrl";

const SosSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  token: z.string().min(1).optional(), // live-session token, if sharing is on
});

export async function POST(req: NextRequest) {
  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = SosSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { lat, lng, token } = parsed.data;

  const [user, contacts] = await Promise.all([
    db.user.findUnique({ where: { id: payload.userId }, select: { name: true, email: true } }),
    db.emergencyContact.findMany({
      where: { userId: payload.userId, email: { not: null } },
      select: { name: true, email: true },
    }),
  ]);

  const withEmail = contacts.filter((c): c is { name: string; email: string } => !!c.email);
  if (withEmail.length === 0) {
    return NextResponse.json(
      { error: "No emergency contacts with an email. Add one in Settings." },
      { status: 400 }
    );
  }

  const riderName = user?.name || user?.email || "A RideByWeather rider";
  const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const watchUrl = token ? `${appOrigin(req)}/watch/${token}` : undefined;
  const { subject, html, text } = sosEmail({ riderName, mapUrl, watchUrl, when: new Date() });

  const results = await Promise.allSettled(
    withEmail.map((c) => sendEmail({ to: c.email, subject, html, text }))
  );
  const sent = results.filter((r) => r.status === "fulfilled").length;

  return NextResponse.json({ sent, total: withEmail.length });
}
