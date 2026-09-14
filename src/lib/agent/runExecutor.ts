import { runDemoAgent } from "@/lib/agent/demoAgent";
import { db } from "@/lib/db/store";
import type { AgentRun, StreamEvent } from "@/lib/types";

/**
 * Streams a demo agent execution as newline-delimited JSON (NDJSON), while
 * persisting each TraceEvent as it happens so the run is durable even if the
 * client disconnects mid-stream. Used by both POST /api/runs and
 * POST /api/runs/[id]/replay.
 */
export function createRunStream(
  run: AgentRun,
  fixApplied?: Record<string, unknown> | null
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (evt: StreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(evt) + "\n"));
      };

      send({ kind: "run_created", run });

      let sawFailure = false;
      try {
        for await (const event of runDemoAgent({
          runId: run.id,
          userRequest: run.userRequest,
          scenario: run.scenario,
          fixApplied,
        })) {
          await db.upsertTraceEvent(event);
          send({ kind: "trace_event", event });
          if (event.status === "failed") sawFailure = true;
        }
      } catch (err) {
        send({ kind: "error", message: err instanceof Error ? err.message : "Unknown error" });
      }

      const completedAt = new Date().toISOString();
      const durationMs = Math.max(
        0,
        new Date(completedAt).getTime() - new Date(run.startedAt).getTime()
      );
      const finalStatus = sawFailure ? "failed" : "completed";

      const updated = await db.updateRun(run.id, {
        status: finalStatus,
        completedAt,
        durationMs,
      });

      send({ kind: "done", run: updated ?? { ...run, status: finalStatus, completedAt, durationMs } });
      controller.close();
    },
  });
}

export const NDJSON_HEADERS = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  "X-Accel-Buffering": "no",
};
