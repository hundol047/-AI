import { NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import { analyzeFailure } from "@/lib/ai/analyze";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await db.getRun(id);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const events = await db.listTraceEvents(id);
  const failedEvent = events.find((e) => e.status === "failed");
  if (!failedEvent) {
    return NextResponse.json({ error: "This run has no failure to analyze." }, { status: 400 });
  }

  const existing = await db.getAnalysis(id);
  if (existing) {
    return NextResponse.json({ analysis: existing });
  }

  try {
    const { result, source } = await analyzeFailure({ run, events });
    const analysis = await db.saveAnalysis({ runId: id, ...result, source });
    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("[analyze] failed:", err);
    return NextResponse.json({ error: "Failed to analyze run" }, { status: 500 });
  }
}
