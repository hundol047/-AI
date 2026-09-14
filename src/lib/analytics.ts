import { db } from "@/lib/db/store";
import type { AgentRun } from "@/lib/types";

export interface AnalyticsSummary {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  successRate: number;
  avgDurationMs: number;
  mostCommonFailure: string | null;
  runsByDay: { date: string; count: number; failed: number }[];
  errorTypes: { type: string; count: number }[];
  statusBreakdown: { name: string; value: number }[];
  recentRuns: AgentRun[];
}

export async function computeAnalytics(): Promise<AnalyticsSummary> {
  const runs = await db.listRuns(500);
  const totalRuns = runs.length;
  const successfulRuns = runs.filter((r) => r.status === "completed").length;
  const failedRuns = runs.filter((r) => r.status === "failed").length;
  const finished = runs.filter((r) => r.durationMs !== undefined);
  const avgDurationMs = finished.length
    ? Math.round(finished.reduce((sum, r) => sum + (r.durationMs ?? 0), 0) / finished.length)
    : 0;

  const failedRunsList = runs.filter((r) => r.status === "failed");
  const errorTypeCounts = new Map<string, number>();
  for (const run of failedRunsList) {
    const events = await db.listTraceEvents(run.id);
    const failedEvent = events.find((e) => e.status === "failed");
    const type = failedEvent?.error?.type ?? "UNKNOWN_ERROR";
    errorTypeCounts.set(type, (errorTypeCounts.get(type) ?? 0) + 1);
  }
  const errorTypes = Array.from(errorTypeCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
  const mostCommonFailure = errorTypes[0]?.type ?? null;

  const dayBuckets = new Map<string, { count: number; failed: number }>();
  for (const run of runs) {
    const date = new Date(run.createdAt).toISOString().slice(0, 10);
    const bucket = dayBuckets.get(date) ?? { count: 0, failed: 0 };
    bucket.count += 1;
    if (run.status === "failed") bucket.failed += 1;
    dayBuckets.set(date, bucket);
  }
  const runsByDay = Array.from(dayBuckets.entries())
    .map(([date, v]) => ({ date, count: v.count, failed: v.failed }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);

  const statusBreakdown = [
    { name: "Completed", value: successfulRuns },
    { name: "Failed", value: failedRuns },
    { name: "Running", value: runs.filter((r) => r.status === "running").length },
  ].filter((s) => s.value > 0);

  return {
    totalRuns,
    successfulRuns,
    failedRuns,
    successRate: totalRuns ? Math.round((successfulRuns / totalRuns) * 1000) / 10 : 0,
    avgDurationMs,
    mostCommonFailure,
    runsByDay,
    errorTypes,
    statusBreakdown,
    recentRuns: runs.slice(0, 8),
  };
}
