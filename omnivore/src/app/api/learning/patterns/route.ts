import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { patterns, policies, experiences } from "@/db/schema";
import { desc } from "drizzle-orm";
import {
  initialPatterns,
  initialPolicies,
  initialExperiences,
} from "@/learning/seed-data";

export async function GET() {
  try {
    const patternList = await db
      .select()
      .from(patterns)
      .orderBy(desc(patterns.createdAt))
      .limit(50);

    const policyList = await db
      .select()
      .from(policies)
      .orderBy(desc(policies.createdAt))
      .limit(50);

    const expList = await db
      .select()
      .from(experiences)
      .orderBy(desc(experiences.createdAt))
      .limit(50);

    return NextResponse.json({
      success: true,
      patterns: patternList.length > 0 ? patternList : initialPatterns,
      policies: policyList.length > 0 ? policyList : initialPolicies,
      experiences: expList.length > 0 ? expList : initialExperiences,
    });
  } catch (error) {
    return NextResponse.json({
      success: true,
      patterns: initialPatterns,
      policies: initialPolicies,
      experiences: initialExperiences,
    });
  }
}
