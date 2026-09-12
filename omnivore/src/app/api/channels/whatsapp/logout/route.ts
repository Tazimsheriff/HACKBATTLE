import { NextResponse } from "next/server";
import { whatsappService } from "@/channels/whatsapp-service";

export const runtime = "nodejs";

export async function POST() {
  try {
    const res = await whatsappService.logout();
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to disconnect WhatsApp" },
      { status: 500 }
    );
  }
}
