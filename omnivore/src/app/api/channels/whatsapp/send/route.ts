import { NextResponse } from "next/server";
import { whatsappService } from "@/channels/whatsapp-service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { recipient, text } = body;

    if (!recipient || !text) {
      return NextResponse.json(
        { success: false, error: "Recipient phone number and message text are required" },
        { status: 400 }
      );
    }

    const res = await whatsappService.sendMessage(recipient, text);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "WhatsApp message dispatched successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to send WhatsApp message" },
      { status: 500 }
    );
  }
}
