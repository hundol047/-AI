import Link from "next/link";
import { ChevronRight, ListTree } from "lucide-react";
import { db } from "@/lib/db/store";
import { RunStatusPill } from "@/components/common/RunStatusBadge";
import { SCENARIO_LABELS } from "@/lib/types";
import { formatDateTime, formatDuration, shortId } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TracesPage() {
  const runs = await db.listRuns(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan/30 bg-cyan/10 text-cyan">
          <ListTree size={20} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-white">Traces</h1>
          <p className="text-sm text-white/45">Agent 실행 기록을 확인하고 상세 분석 페이지로 이동하세요.</p>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        {runs.length === 0 ? (
          <div className="p-12 text-center text-sm text-white/40">
            아직 실행 기록이 없습니다. Playground에서 첫 Agent를 실행해보세요.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/40">
                  <th className="py-3 pl-5 font-medium">Session</th>
                  <th className="py-3 font-medium">User Request</th>
                  <th className="py-3 font-medium">Scenario</th>
                  <th className="py-3 font-medium">Started</th>
                  <th className="py-3 font-medium">Duration</th>
                  <th className="py-3 font-medium">Status</th>
                  <th className="py-3 pr-5" />
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-b border-white/5 transition-colors hover:bg-white/[0.03]">
                    <td className="py-3 pl-5 font-mono text-xs text-white/50">#{shortId(run.id)}</td>
                    <td className="max-w-[280px] truncate py-3 pr-4 text-white/85">{run.userRequest}</td>
                    <td className="py-3 pr-4 text-xs text-white/50">{SCENARIO_LABELS[run.scenario]}</td>
                    <td className="py-3 pr-4 text-xs text-white/45">{formatDateTime(run.startedAt)}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-white/45">{formatDuration(run.durationMs)}</td>
                    <td className="py-3 pr-4">
                      <RunStatusPill status={run.status} />
                    </td>
                    <td className="py-3 pr-5 text-right">
                      <Link
                        href={`/traces/${run.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-cyan hover:underline"
                      >
                        상세보기 <ChevronRight size={14} />
                      </Link>
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
