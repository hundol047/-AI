import { NextResponse } from "next/server";
import { db } from "@/lib/db/store";
import { analyzeFailure } from "@/lib/ai/analyze";
import { buildFixForScenario } from "@/lib/agent/demoAgent";
import { createRunStream, NDJSON_HEADERS } from "@/lib/agent/runExecutor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let replayRun;
  let fixApplied: Record<string, unknown>;
  try {
    const originalRun = await db.getRun(id);
    if (!originalRun) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const events = await db.listTraceEvents(id);
    const failedEvent = events.find((e) => e.status === "failed");
    if (!failedEvent) {
      return NextResponse.json({ error: "Nothing to replay: this run has no failure." }, { status: 400 });
    }

    // Ensure a Root Cause Analysis exists before applying its fix.
    let analysis = await db.getAnalysis(id);
    if (!analysis) {
      const { result, source } = await analyzeFailure({ run: originalRun, events });
      analysis = await db.saveAnalysis({ runId: id, ...result, source });
    }

    fixApplied = buildFixForScenario(originalRun.scenario);

    replayRun = await db.createRun({
      userRequest: originalRun.userRequest,
      scenario: originalRun.scenario,
    });

    await db.saveReplay({
      originalRunId: originalRun.id,
      replayRunId: replayRun.id,
      fixApplied,
    });
  } catch (err) {
    console.error(`[POST /api/runs/${id}/replay] failed:`, err);
    return NextResponse.json({ error: "Failed to start replay." }, { status: 500 });
  }

  const stream = createRunStream(replayRun, fixApplied);
  return new Response(stream, { headers: NDJSON_HEADERS });
}
