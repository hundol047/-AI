import Link from "next/link";
import { Activity, CheckCircle2, XCircle, Percent, ArrowRight } from "lucide-react";
import { computeAnalytics } from "@/lib/analytics";
import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { RunStatusPill } from "@/components/common/RunStatusBadge";
import { DataLoadError } from "@/components/common/DataLoadError";
import { SCENARIO_LABELS } from "@/lib/types";
import { formatDateTime, formatDuration, shortId } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let summary: Awaited<ReturnType<typeof computeAnalytics>>;
  try {
    summary = await computeAnalytics();
  } catch (err) {
    console.error("[DashboardPage] computeAnalytics failed:", err);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white">Overview</h1>
          <p className="text-sm text-white/45">TraceAgent의 전체 실행 현황을 한눈에 확인하세요.</p>
        </div>
        <DataLoadError message={`실행 현황을 불러오지 못했습니다: ${err instanceof Error ? err.message : String(err)}`} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Overview</h1>
        <p className="text-sm text-white/45">TraceAgent의 전체 실행 현황을 한눈에 확인하세요.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AnalyticsCard label="Total Runs" value={String(summary.totalRuns)} icon={Activity} accent="cyan" />
        <AnalyticsCard label="Successful Runs" value={String(summary.successfulRuns)} icon={CheckCircle2} accent="success" />
        <AnalyticsCard label="Failed Runs" value={String(summary.failedRuns)} icon={XCircle} accent="danger" />
        <AnalyticsCard label="Success Rate" value={`${summary.successRate}%`} icon={Percent} accent="purple" />
      </div>

      <div className="glass-panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">최근 실행</h2>
          <Link href="/traces" className="inline-flex items-center gap-1 text-xs text-cyan hover:underline">
            전체 보기 <ArrowRight size={13} />
          </Link>
        </div>

        {summary.recentRuns.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-white/40">아직 실행 기록이 없습니다.</p>
            <Link href="/playground" className="btn-primary !px-4 !py-2 text-xs">
              Playground에서 시작하기
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/40">
                  <th className="py-2.5 font-medium">Session</th>
                  <th className="py-2.5 font-medium">Request</th>
                  <th className="py-2.5 font-medium">Scenario</th>
                  <th className="py-2.5 font-medium">Duration</th>
                  <th className="py-2.5 font-medium">Started</th>
                  <th className="py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentRuns.map((run) => (
                  <tr key={run.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                    <td className="py-2.5">
                      <Link href={`/traces/${run.id}`} className="font-mono text-xs text-cyan hover:underline">
                        #{shortId(run.id)}
                      </Link>
                    </td>
                    <td className="max-w-[220px] truncate py-2.5 pr-4 text-white/80">{run.userRequest}</td>
                    <td className="py-2.5 pr-4 text-xs text-white/50">{SCENARIO_LABELS[run.scenario]}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-white/45">{formatDuration(run.durationMs)}</td>
                    <td className="py-2.5 pr-4 text-xs text-white/40">{formatDateTime(run.startedAt)}</td>
                    <td className="py-2.5">
                      <RunStatusPill status={run.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
