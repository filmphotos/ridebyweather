import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendEmail, passwordResetEmail } from "@/lib/email";

const ForgotSchema = z.object({
  email: z.string().email(),
});

const GENERIC_RESPONSE = {
  ok: true,
  message: "If an account exists for that email, a reset link has been sent.",
};

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getBaseUrl(req: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ForgotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const { email } = parsed.data;
    const user = await db.user.findUnique({ where: { email } });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await db.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });

      const resetUrl = `${getBaseUrl(req)}/reset-password?token=${rawToken}`;
      const { subject, html, text } = passwordResetEmail(resetUrl);

      try {
        await sendEmail({ to: user.email, subject, html, text });
      } catch (err) {
        console.error("Password reset email send failed:", err);
      }
    }

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json(GENERIC_RESPONSE);
  }
}
