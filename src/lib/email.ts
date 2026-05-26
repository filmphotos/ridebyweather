interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "RideByWeather <noreply@ridebyweather.com>";

  if (!apiKey) {
    console.log("[email:dev] No RESEND_API_KEY set — logging email instead of sending");
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Text:\n${text}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend send failed (${res.status}): ${body}`);
  }
}

export function passwordResetEmail(resetUrl: string): { subject: string; html: string; text: string } {
  const subject = "Reset your RideByWeather password";
  const text = [
    "We received a request to reset your RideByWeather password.",
    "",
    `Reset link: ${resetUrl}`,
    "",
    "This link expires in 1 hour. If you didn't request a reset, you can ignore this email.",
  ].join("\n");
  const html = `<!doctype html>
<html><body style="font-family:system-ui,-apple-system,sans-serif;background:#0b1220;color:#e5e7eb;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#111827;border:1px solid #1f2937;border-radius:12px;padding:32px">
    <h1 style="margin:0 0 8px;color:#fff;font-size:20px">Reset your password</h1>
    <p style="margin:0 0 24px;color:#9ca3af;font-size:14px">We received a request to reset your RideByWeather password.</p>
    <a href="${resetUrl}" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:14px">Reset password</a>
    <p style="margin:24px 0 0;color:#6b7280;font-size:12px;word-break:break-all">Or paste this link in your browser:<br/>${resetUrl}</p>
    <p style="margin:24px 0 0;color:#6b7280;font-size:12px">This link expires in 1 hour. If you didn't request a reset, you can ignore this email.</p>
  </div>
</body></html>`;
  return { subject, html, text };
}
