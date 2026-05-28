import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

// Returns a PNG QR code that encodes the /link?code=... approval URL.
// The device downloads this image (Connect IQ makeImageRequest) rather than
// rendering a QR itself.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code || !/^[A-Z0-9]{4,12}$/.test(code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const url = `${origin}/link?code=${code}`;

  try {
    const png = await QRCode.toBuffer(url, {
      type: "png",
      width: 200,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#000000ff", light: "#ffffffff" },
    });

    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("device/qr error:", err);
    return NextResponse.json({ error: "Failed to render QR" }, { status: 500 });
  }
}
