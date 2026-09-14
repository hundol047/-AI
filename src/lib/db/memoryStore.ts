import type { AgentRun, FailureAnalysis, ReplayRecord, TraceEvent } from "@/lib/types";

/**
 * Process-wide in-memory fallback store, used automatically whenever Supabase
 * env vars are not configured. This keeps the whole demo runnable with
 * `npm install && npm run dev` and no external services, per the "mock
 * fallback" requirement. Not suitable for multi-instance production use.
 */
interface MemoryDB {
  runs: Map<string, AgentRun>;
  events: Map<string, TraceEvent[]>; // runId -> events
  analyses: Map<string, FailureAnalysis>; // runId -> analysis
  replays: Map<string, ReplayRecord>; // originalRunId -> replay
}

const globalForMemory = globalThis as unknown as { __traceAgentMemoryDB?: MemoryDB };

export function getMemoryDB(): MemoryDB {
  if (!globalForMemory.__traceAgentMemoryDB) {
    globalForMemory.__traceAgentMemoryDB = {
      runs: new Map(),
      events: new Map(),
      analyses: new Map(),
      replays: new Map(),
    };
  }
  return globalForMemory.__traceAgentMemoryDB;
}
