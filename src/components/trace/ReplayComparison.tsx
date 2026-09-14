import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import type { AgentRun, TraceEvent } from "@/lib/types";

function countErrors(events: TraceEvent[]) {
  return events.filter((e) => e.status === "failed").length;
}

function successRate(events: TraceEvent[]) {
  const relevant = events.filter((e) => e.status !== "skipped" && e.status !== "pending");
  if (relevant.length === 0) return 0;
  const ok = relevant.filter((e) => e.status === "completed").length;
  return Math.round((ok / relevant.length) * 100);
}

export function ReplayComparison({
  before,
  after,
}: {
  before: { run: AgentRun; events: TraceEvent[] };
  after: { run: AgentRun; events: TraceEvent[] };
}) {
  const errorsBefore = countErrors(before.events);
  const errorsAfter = countErrors(after.events);
  const rateBefore = successRate(before.events);
  const rateAfter = successRate(after.events);

  return (
    <div className="glass-panel animate-slide-up space-y-4 border-success/30 p-4">
      <div className="flex items-center gap-2 text-success">
        <CheckCircle2 size={18} />
        <h3 className="text-sm font-bold">Replay Successful</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-danger/30 bg-danger/[0.06] p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-danger">
            <XCircle size={13} /> Before
          </div>
          <div className="text-sm font-bold text-white/90">{before.run.status === "failed" ? "FAILED" : before.run.status.toUpperCase()}</div>
          {errorsBefore > 0 && <div className="mt-0.5 text-[11px] text-danger/80">{errorsBefore}개 오류 발생</div>}
        </div>
        <div className="rounded-lg border border-success/30 bg-success/[0.06] p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-success">
            <CheckCircle2 size={13} /> After
          </div>
          <div className="text-sm font-bold text-white/90">{after.run.status.toUpperCase()}</div>
          <div className="mt-0.5 text-[11px] text-success/80">모든 단계 정상 완료</div>
        </div>
      </div>

      <div className="space-y-2.5 border-t border-white/10 pt-3">
        <MetricRow label="Errors" before={String(errorsBefore)} after={String(errorsAfter)} good={errorsAfter <= errorsBefore} />
        <MetricRow label="Success Rate" before={`${rateBefore}%`} after={`${rateAfter}%`} good={rateAfter >= rateBefore} />
        <MetricRow
          label="Execution Time"
          before={formatDuration(before.run.durationMs)}
          after={formatDuration(after.run.durationMs)}
          good
        />
        <MetricRow label="Status" before={before.run.status === "failed" ? "Failed" : "Completed"} after="Completed" good />
      </div>
    </div>
  );
}

function MetricRow({ label, before, after, good }: { label: string; before: string; after: string; good: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-white/50">{label}</span>
      <span className="flex items-center gap-1.5 font-mono">
        <span className="text-white/40">{before}</span>
        <ArrowRight size={11} className="text-white/30" />
        <span className={cn("font-semibold", good ? "text-success" : "text-white/80")}>{after}</span>
      </span>
    </div>
  );
}
