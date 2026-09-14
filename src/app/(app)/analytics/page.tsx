import { Activity, CheckCircle2, XCircle, Percent, Timer, AlertOctagon } from "lucide-react";
import { computeAnalytics } from "@/lib/analytics";
import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { RunsByDayChart, ErrorTypesChart, StatusBreakdownChart } from "@/components/analytics/AnalyticsCharts";
import { formatDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const summary = await computeAnalytics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-white/45">성공률, 오류 유형, 실행 시간 등의 통계를 확인하세요.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <AnalyticsCard label="Total Runs" value={String(summary.totalRuns)} icon={Activity} accent="cyan" />
        <AnalyticsCard label="Successful" value={String(summary.successfulRuns)} icon={CheckCircle2} accent="success" />
        <AnalyticsCard label="Failed" value={String(summary.failedRuns)} icon={XCircle} accent="danger" />
        <AnalyticsCard label="Success Rate" value={`${summary.successRate}%`} icon={Percent} accent="purple" />
        <AnalyticsCard label="Avg. Execution Time" value={formatDuration(summary.avgDurationMs)} icon={Timer} accent="cyan" />
        <AnalyticsCard
          label="Most Common Failure"
          value={summary.mostCommonFailure ?? "–"}
          icon={AlertOctagon}
          accent="danger"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass-panel p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-white">Runs by Day</h2>
          <RunsByDayChart data={summary.runsByDay} />
        </div>
        <div className="glass-panel p-5">
          <h2 className="mb-3 text-sm font-semibold text-white">Success vs Failure</h2>
          <StatusBreakdownChart data={summary.statusBreakdown} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass-panel p-5">
          <h2 className="mb-3 text-sm font-semibold text-white">Error Types</h2>
          <ErrorTypesChart data={summary.errorTypes} />
        </div>
        <div className="glass-panel p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-white">최근 실행</h2>
          <div className="space-y-2">
            {summary.recentRuns.length === 0 && <p className="text-sm text-white/40">데이터가 없습니다.</p>}
            {summary.recentRuns.map((run) => (
              <div key={run.id} className="flex items-center justify-between border-b border-white/5 py-2 text-xs last:border-0">
                <span className="truncate text-white/70">{run.userRequest}</span>
                <span
                  className={
                    run.status === "failed"
                      ? "text-danger"
                      : run.status === "completed"
                      ? "text-success"
                      : "text-cyan"
                  }
                >
                  {run.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
