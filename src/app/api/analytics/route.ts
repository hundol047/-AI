import { NextResponse } from "next/server";
import { computeAnalytics } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const summary = await computeAnalytics();
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[GET /api/analytics] failed:", err);
    return NextResponse.json({ error: "Failed to load analytics." }, { status: 500 });
  }
}
