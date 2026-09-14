import { NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import type { RunWithDetails } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await db.getRun(id);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const [events, analysis, replay] = await Promise.all([
    db.listTraceEvents(id),
    db.getAnalysis(id),
    db.getReplayByOriginalRunId(id),
  ]);

  const payload: RunWithDetails = { run, events, analysis, replay };
  return NextResponse.json(payload);
}
