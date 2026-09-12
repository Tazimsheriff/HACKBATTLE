import { NextResponse } from "next/server";
import { whatsappService } from "@/channels/whatsapp-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const status = whatsappService.getStatus();
    return NextResponse.json({ success: true, ...status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch WhatsApp status" },
      { status: 500 }
    );
  }
}
