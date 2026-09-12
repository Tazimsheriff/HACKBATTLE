import { NextResponse } from "next/server";
import { seedDemoData } from "@/learning/seed-data";

export async function POST() {
  try {
    const result = await seedDemoData();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to seed demo data" },
      { status: 500 }
    );
  }
}
