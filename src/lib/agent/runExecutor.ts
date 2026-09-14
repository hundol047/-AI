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
          // Persistence failures (a transient Supabase blip, a gateway
          // timeout, ...) must never abort the actual agent execution — the
          // real Tavily/OpenAI work has nothing to do with whether this one
          // event could be saved. Log it and keep the run going; only a
          // failure in the agent logic itself should stop the stream.
          try {
            await db.upsertTraceEvent(event);
          } catch (persistErr) {
            console.error(
              `[createRunStream] Failed to persist trace event (${event.step}/${event.status}) for run ${run.id}:`,
              persistErr
            );
          }
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
      const fallbackRun = { ...run, status: finalStatus, completedAt, durationMs } as AgentRun;

      let updated: AgentRun | null = null;
      try {
        updated = await db.updateRun(run.id, { status: finalStatus, completedAt, durationMs });
      } catch (err) {
        console.error(`[createRunStream] Failed to persist final status for run ${run.id}:`, err);
      }

      send({ kind: "done", run: updated ?? fallbackRun });
      controller.close();
    },
  });
}

export const NDJSON_HEADERS = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  "X-Accel-Buffering": "no",
};
