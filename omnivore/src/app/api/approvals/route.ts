import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { approvalRequests } from "@/db/schema";
import { desc } from "drizzle-orm";
import { initialApprovals } from "@/learning/seed-data";

export async function GET() {
  try {
    const list = await db
      .select()
      .from(approvalRequests)
      .orderBy(desc(approvalRequests.createdAt))
      .limit(50);

    if (list.length === 0) {
      return NextResponse.json({ success: true, approvals: initialApprovals });
    }
    return NextResponse.json({ success: true, approvals: list });
  } catch (error) {
    return NextResponse.json({ success: true, approvals: initialApprovals });
  }
}
