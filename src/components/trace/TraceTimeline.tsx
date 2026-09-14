"use client";

import { STEP_LABELS, type StepName, type TraceEvent } from "@/lib/types";
import { cn, formatDuration, formatTime } from "@/lib/utils";
import { describeEvent } from "@/lib/traceDescribe";
import { RunStatusBadge } from "@/components/common/RunStatusBadge";

export function TraceTimeline({
  events,
  onSelect,
  selectedStep,
}: {
  events: TraceEvent[];
  onSelect?: (step: StepName) => void;
  selectedStep?: StepName | null;
}) {
  if (events.length === 0) {
    return <div className="p-8 text-center text-sm text-white/40">아직 기록된 실행 이벤트가 없습니다.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/40">
            <th className="w-24 py-2.5 pl-4 font-medium">Time</th>
            <th className="w-32 py-2.5 font-medium">Step</th>
            <th className="py-2.5 font-medium">Details</th>
            <th className="w-24 py-2.5 font-medium">Duration</th>
            <th className="w-16 py-2.5 pr-4 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => {
            const failed = event.status === "failed";
            return (
              <tr
                key={event.id}
                onClick={() => onSelect?.(event.step)}
                className={cn(
                  "cursor-pointer border-b border-white/5 transition-colors hover:bg-white/[0.03]",
                  failed && "bg-danger/[0.06] hover:bg-danger/[0.1]",
                  selectedStep === event.step && "bg-cyan/[0.06]"
                )}
              >
                <td className="py-2.5 pl-4 font-mono text-xs text-white/50">{formatTime(event.startedAt)}</td>
                <td className={cn("py-2.5 text-xs font-semibold", failed ? "text-danger" : "text-white/85")}>
                  {STEP_LABELS[event.step]}
                </td>
                <td className={cn("truncate py-2.5 pr-4 text-xs", failed ? "text-danger/90" : "text-white/60")}>
                  {describeEvent(event)}
                </td>
                <td className="py-2.5 font-mono text-xs text-white/45">{formatDuration(event.durationMs)}</td>
                <td className="py-2.5 pr-4">
                  <RunStatusBadge status={event.status} className="px-2 py-0.5 text-[10px]" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
