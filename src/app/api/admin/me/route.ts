import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ admin: null }, { status: 401 });
  return NextResponse.json({ admin });
}
