"use client";

import { useState } from "react";
import { cn, formatDuration, formatTime } from "@/lib/utils";
import { STEP_LABELS, type StepName, type TraceEvent } from "@/lib/types";
import { RunStatusBadge } from "@/components/common/RunStatusBadge";

type Tab = "input" | "output" | "metadata";

function JsonView({ data }: { data: unknown }) {
  if (data === undefined || data === null) {
    return <div className="text-xs text-white/30">데이터가 없습니다.</div>;
  }
  return <pre className="code-block whitespace-pre-wrap break-words">{JSON.stringify(data, null, 2)}</pre>;
}

export function StepDetails({ step, event }: { step: StepName | null; event: TraceEvent | undefined }) {
  const [tab, setTab] = useState<Tab>("input");

  if (!step) {
    return (
      <div className="glass-panel flex h-full min-h-[220px] flex-col items-center justify-center gap-2 p-6 text-center">
        <span className="text-sm text-white/40">타임라인에서 단계를 선택하면</span>
        <span className="text-sm text-white/40">상세 정보를 확인할 수 있습니다.</span>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="glass-panel flex h-full min-h-[220px] flex-col items-center justify-center p-6 text-center text-sm text-white/40">
        {STEP_LABELS[step]} 단계는 아직 실행되지 않았습니다.
      </div>
    );
  }

  return (
    <div className="glass-panel flex h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{STEP_LABELS[step]}</h3>
        <RunStatusBadge status={event.status} />
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 text-xs text-white/50">
        <div>
          Tool: <span className="text-white/80">{event.toolName ?? "–"}</span>
        </div>
        <div>
          Duration: <span className="text-white/80">{formatDuration(event.durationMs)}</span>
        </div>
        <div>
          Started: <span className="text-white/80">{formatTime(event.startedAt)}</span>
        </div>
        <div>
          Completed: <span className="text-white/80">{formatTime(event.completedAt)}</span>
        </div>
      </div>

      {event.error && (
        <div className="mb-3 rounded-lg border border-danger/30 bg-danger/[0.08] p-2.5 text-xs text-danger/90">
          <span className="font-semibold">{event.error.type}</span>
          {event.error.status ? ` (${event.error.status})` : ""} — {event.error.message}
        </div>
      )}

      <div className="mb-2 flex gap-1 border-b border-white/10">
        {(["input", "output", "metadata"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "border-b-2 px-3 py-1.5 text-xs font-medium capitalize transition-colors",
              tab === t ? "border-cyan text-cyan" : "border-transparent text-white/40 hover:text-white/70"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "input" && <JsonView data={event.input} />}
        {tab === "output" && <JsonView data={event.output ?? event.error} />}
        {tab === "metadata" && (
          <JsonView
            data={{
              step: event.step,
              status: event.status,
              toolName: event.toolName,
              startedAt: event.startedAt,
              completedAt: event.completedAt,
              durationMs: event.durationMs,
            }}
          />
        )}
      </div>
    </div>
  );
}
