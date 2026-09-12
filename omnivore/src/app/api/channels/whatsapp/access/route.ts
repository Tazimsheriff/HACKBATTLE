import { NextResponse } from "next/server";
import { whatsappService } from "@/channels/whatsapp-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const status = whatsappService.getStatus();
    return NextResponse.json({
      success: true,
      accessMode: status.accessMode || "owner_only",
      allowedUsers: status.allowedUsers || [],
      allowedGroupsCount: status.allowedGroupsCount || 0,
      ownerPhone: status.phoneNumber || "+919677054449",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, mode, phoneNumber, groupJid } = body;

    if (action === "set_mode" && mode) {
      if (mode === "owner_only" || mode === "allowlist" || mode === "public") {
        whatsappService.accessMode = mode;
        return NextResponse.json({ success: true, accessMode: whatsappService.accessMode });
      }
      return NextResponse.json({ success: false, error: "Invalid access mode" }, { status: 400 });
    }

    if (action === "allow_user" && phoneNumber) {
      const clean = phoneNumber.replace(/[^0-9]/g, "");
      whatsappService.allowedUsers.add(clean);
      whatsappService.accessMode = "allowlist";
      return NextResponse.json({
        success: true,
        allowedUsers: Array.from(whatsappService.allowedUsers),
      });
    }

    if (action === "revoke_user" && phoneNumber) {
      const clean = phoneNumber.replace(/[^0-9]/g, "");
      whatsappService.allowedUsers.delete(clean);
      return NextResponse.json({
        success: true,
        allowedUsers: Array.from(whatsappService.allowedUsers),
      });
    }

    if (action === "revoke_group" && groupJid) {
      whatsappService.allowedGroups.delete(groupJid);
      return NextResponse.json({
        success: true,
        allowedGroupsCount: whatsappService.allowedGroups.size,
      });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
