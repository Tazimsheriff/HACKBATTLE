import { NextResponse } from "next/server";
import { whatsappService } from "@/channels/whatsapp-service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { phoneNumber } = body;

    if (!phoneNumber || typeof phoneNumber !== "string") {
      return NextResponse.json(
        { success: false, error: "Valid phone number with country code is required (e.g. +919876543210)" },
        { status: 400 }
      );
    }

    const res = await whatsappService.startPairing(phoneNumber);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      pairingCode: res.pairingCode,
      message: res.pairingCode
        ? "Pairing code generated. Enter this in WhatsApp > Linked Devices > Link with phone number."
        : "WhatsApp client is already connected or pairing in background.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to start WhatsApp pairing" },
      { status: 500 }
    );
  }
}
