import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

export const dynamic = "force-dynamic";

// One-time, auth-gated helper to create the device_pairings table in prod
// (equivalent to prisma/migrations/device_pairings.sql). Idempotent and
// fixed SQL — no user input. Safe to remove after the table exists.
export async function GET(req: NextRequest) {
  const payload = await getAuthPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "device_pairings" (
        "id"           TEXT NOT NULL,
        "code"         TEXT NOT NULL,
        "deviceSecret" TEXT NOT NULL,
        "status"       TEXT NOT NULL DEFAULT 'pending',
        "token"        TEXT,
        "userId"       TEXT,
        "deviceLabel"  TEXT,
        "expiresAt"    TIMESTAMP(3) NOT NULL,
        "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "device_pairings_pkey" PRIMARY KEY ("id")
      );
    `);
    await db.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "device_pairings_code_key" ON "device_pairings"("code");`
    );
    await db.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "device_pairings_deviceSecret_key" ON "device_pairings"("deviceSecret");`
    );
    await db.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "device_pairings_deviceSecret_idx" ON "device_pairings"("deviceSecret");`
    );
    return NextResponse.json({ ok: true, message: "device_pairings table ready" });
  } catch (err) {
    console.error("device/init error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
