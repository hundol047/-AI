import { randomUUID } from "crypto";
import type { AgentRun, FailureAnalysis, ReplayRecord, Scenario, TraceEvent } from "@/lib/types";
import { getMemoryDB } from "@/lib/db/memoryStore";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/db/supabaseClient";

// ---------------------------------------------------------------------------
// Row <-> domain type mapping for the Supabase backend
// ---------------------------------------------------------------------------

function runRowToRun(row: Record<string, unknown>): AgentRun {
  return {
    id: row.id as string,
    userRequest: row.user_request as string,
    status: row.status as AgentRun["status"],
    scenario: row.scenario as Scenario,
    startedAt: row.started_at as string,
    completedAt: (row.completed_at as string) ?? undefined,
    durationMs: (row.duration_ms as number) ?? undefined,
    createdAt: row.created_at as string,
  };
}

function eventRowToEvent(row: Record<string, unknown>): TraceEvent {
  return {
    id: `${row.run_id as string}::${row.step as string}`,
    runId: row.run_id as string,
    step: row.step as TraceEvent["step"],
    status: row.status as TraceEvent["status"],
    toolName: (row.tool_name as string) ?? undefined,
    input: row.input ?? undefined,
    output: row.output ?? undefined,
    error: (row.error as TraceEvent["error"]) ?? null,
    startedAt: row.started_at as string,
    completedAt: (row.completed_at as string) ?? undefined,
    durationMs: (row.duration_ms as number) ?? undefined,
  };
}

function analysisRowToAnalysis(row: Record<string, unknown>): FailureAnalysis {
  return {
    id: row.id as string,
    runId: row.run_id as string,
    failureType: row.failure_type as string,
    rootCause: row.root_cause as string,
    riskLevel: row.risk_level as FailureAnalysis["riskLevel"],
    explanation: row.explanation as string,
    recommendedFix: row.recommended_fix as string,
    fixSteps: (row.fix_steps as string[]) ?? [],
    patchSuggestion: row.patch_suggestion as string,
    createdAt: row.created_at as string,
    source: (row.source as FailureAnalysis["source"]) ?? "openai",
  };
}

function replayRowToReplay(row: Record<string, unknown>): ReplayRecord {
  return {
    id: row.id as string,
    originalRunId: row.original_run_id as string,
    replayRunId: row.replay_run_id as string,
    fixApplied: (row.fix_applied as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
  };
}

// ---------------------------------------------------------------------------
// Public data-access API. Transparently backed by Supabase when configured,
// otherwise by an in-memory store so the app runs with zero external setup.
// ---------------------------------------------------------------------------

export async function createRun(input: { userRequest: string; scenario: Scenario }): Promise<AgentRun> {
  const now = new Date().toISOString();
  const run: AgentRun = {
    id: randomUUID(),
    userRequest: input.userRequest,
    status: "running",
    scenario: input.scenario,
    startedAt: now,
    createdAt: now,
  };

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServerClient()!;
    const { data, error } = await supabase
      .from("agent_runs")
      .insert({
        id: run.id,
        user_request: run.userRequest,
        status: run.status,
        scenario: run.scenario,
        started_at: run.startedAt,
        created_at: run.createdAt,
      })
      .select()
      .single();
    if (error) throw new Error(`[supabase] createRun failed: ${error.message}`);
    return runRowToRun(data);
  }

  const mem = getMemoryDB();
  mem.runs.set(run.id, run);
  mem.events.set(run.id, []);
  return run;
}

export async function updateRun(
  id: string,
  patch: Partial<Pick<AgentRun, "status" | "completedAt" | "durationMs">>
): Promise<AgentRun | null> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServerClient()!;
    const { data, error } = await supabase
      .from("agent_runs")
      .update({
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.completedAt ? { completed_at: patch.completedAt } : {}),
        ...(patch.durationMs !== undefined ? { duration_ms: patch.durationMs } : {}),
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(`[supabase] updateRun failed: ${error.message}`);
    return runRowToRun(data);
  }

  const mem = getMemoryDB();
  const existing = mem.runs.get(id);
  if (!existing) return null;
  const updated: AgentRun = { ...existing, ...patch };
  mem.runs.set(id, updated);
  return updated;
}

export async function getRun(id: string): Promise<AgentRun | null> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServerClient()!;
    const { data, error } = await supabase.from("agent_runs").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`[supabase] getRun failed: ${error.message}`);
    return data ? runRowToRun(data) : null;
  }
  const mem = getMemoryDB();
  return mem.runs.get(id) ?? null;
}

export async function listRuns(limit = 100): Promise<AgentRun[]> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServerClient()!;
    const { data, error } = await supabase
      .from("agent_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`[supabase] listRuns failed: ${error.message}`);
    return (data ?? []).map(runRowToRun);
  }
  const mem = getMemoryDB();
  return Array.from(mem.runs.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export async function upsertTraceEvent(event: TraceEvent): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServerClient()!;
    const { error } = await supabase.from("trace_events").upsert(
      {
        run_id: event.runId,
        step: event.step,
        status: event.status,
        tool_name: event.toolName ?? null,
        input: event.input ?? null,
        output: event.output ?? null,
        error: event.error ?? null,
        started_at: event.startedAt,
        completed_at: event.completedAt ?? null,
        duration_ms: event.durationMs ?? null,
      },
      { onConflict: "run_id,step" }
    );
    if (error) throw new Error(`[supabase] upsertTraceEvent failed: ${error.message}`);
    return;
  }

  const mem = getMemoryDB();
  const list = mem.events.get(event.runId) ?? [];
  const idx = list.findIndex((e) => e.step === event.step);
  if (idx >= 0) {
    list[idx] = event;
  } else {
    list.push(event);
  }
  mem.events.set(event.runId, list);
}

const STEP_ORDER = ["user_request", "plan", "search", "tool_call", "result"];

export async function listTraceEvents(runId: string): Promise<TraceEvent[]> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServerClient()!;
    const { data, error } = await supabase
      .from("trace_events")
      .select("*")
      .eq("run_id", runId)
      .order("started_at", { ascending: true });
    if (error) throw new Error(`[supabase] listTraceEvents failed: ${error.message}`);
    return (data ?? []).map(eventRowToEvent);
  }
  const mem = getMemoryDB();
  const list = mem.events.get(runId) ?? [];
  return [...list].sort((a, b) => STEP_ORDER.indexOf(a.step) - STEP_ORDER.indexOf(b.step));
}

export async function saveAnalysis(
  analysis: Omit<FailureAnalysis, "id" | "createdAt">
): Promise<FailureAnalysis> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServerClient()!;
    const { data, error } = await supabase
      .from("failure_analyses")
      .insert({
        run_id: analysis.runId,
        failure_type: analysis.failureType,
        root_cause: analysis.rootCause,
        risk_level: analysis.riskLevel,
        explanation: analysis.explanation,
        recommended_fix: analysis.recommendedFix,
        fix_steps: analysis.fixSteps,
        patch_suggestion: analysis.patchSuggestion,
        source: analysis.source,
        created_at: now,
      })
      .select()
      .single();
    if (error) throw new Error(`[supabase] saveAnalysis failed: ${error.message}`);
    return analysisRowToAnalysis(data);
  }

  const mem = getMemoryDB();
  const full: FailureAnalysis = { ...analysis, id: randomUUID(), createdAt: now };
  mem.analyses.set(analysis.runId, full);
  return full;
}

export async function getAnalysis(runId: string): Promise<FailureAnalysis | null> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServerClient()!;
    const { data, error } = await supabase
      .from("failure_analyses")
      .select("*")
      .eq("run_id", runId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`[supabase] getAnalysis failed: ${error.message}`);
    return data ? analysisRowToAnalysis(data) : null;
  }
  const mem = getMemoryDB();
  return mem.analyses.get(runId) ?? null;
}

export async function saveReplay(
  replay: Omit<ReplayRecord, "id" | "createdAt">
): Promise<ReplayRecord> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServerClient()!;
    const { data, error } = await supabase
      .from("replays")
      .insert({
        original_run_id: replay.originalRunId,
        replay_run_id: replay.replayRunId,
        fix_applied: replay.fixApplied,
        created_at: now,
      })
      .select()
      .single();
    if (error) throw new Error(`[supabase] saveReplay failed: ${error.message}`);
    return replayRowToReplay(data);
  }

  const mem = getMemoryDB();
  const full: ReplayRecord = { ...replay, id: randomUUID(), createdAt: now };
  mem.replays.set(replay.originalRunId, full);
  return full;
}

export async function getReplayByOriginalRunId(runId: string): Promise<ReplayRecord | null> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServerClient()!;
    const { data, error } = await supabase
      .from("replays")
      .select("*")
      .eq("original_run_id", runId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`[supabase] getReplayByOriginalRunId failed: ${error.message}`);
    return data ? replayRowToReplay(data) : null;
  }
  const mem = getMemoryDB();
  return mem.replays.get(runId) ?? null;
}

export const db = {
  createRun,
  updateRun,
  getRun,
  listRuns,
  upsertTraceEvent,
  listTraceEvents,
  saveAnalysis,
  getAnalysis,
  saveReplay,
  getReplayByOriginalRunId,
};
