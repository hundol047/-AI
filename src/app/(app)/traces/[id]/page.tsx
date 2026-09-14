"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, ArrowLeft, ExternalLink } from "lucide-react";
import { AgentExecutionFlow } from "@/components/trace/AgentExecutionFlow";
import { TraceTimeline } from "@/components/trace/TraceTimeline";
import { TraceLogTable } from "@/components/trace/TraceLogTable";
import { StepDetails } from "@/components/trace/StepDetails";
import { FailureAlert } from "@/components/trace/FailureAlert";
import { RootCausePanel } from "@/components/trace/RootCausePanel";
import { RecommendedFixPanel } from "@/components/trace/RecommendedFixPanel";
import { ReplayComparison } from "@/components/trace/ReplayComparison";
import { RunStatusPill } from "@/components/common/RunStatusBadge";
import { useRunStream } from "@/hooks/useRunStream";
import { cn, formatDateTime, formatDuration, shortId } from "@/lib/utils";
import type { RunWithDetails, StepName } from "@/lib/types";

type Tab = "timeline" | "logs" | "tool_calls" | "state" | "artifacts";
const TABS: { id: Tab; label: string }[] = [
  { id: "timeline", label: "Timeline" },
  { id: "logs", label: "Logs" },
  { id: "tool_calls", label: "Tool Calls" },
  { id: "state", label: "State" },
  { id: "artifacts", label: "Artifacts" },
];

export default function TraceDetailPage() {
  const params = useParams<{ id: string }>();
  const runId = params.id;

  const [data, setData] = useState<RunWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("timeline");
  const [selectedStep, setSelectedStep] = useState<StepName | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const replay = useRunStream();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/runs/${runId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "불러오기에 실패했습니다.");
      setData(json as RunWithDetails);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "불러오기에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    load();
  }, [load]);

  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/runs/${runId}/analyze`, { method: "POST" });
      const json = await res.json();
      if (res.ok) setData((prev) => (prev ? { ...prev, analysis: json.analysis } : prev));
    } finally {
      setAnalyzing(false);
    }
  }, [runId]);

  useEffect(() => {
    if (data && data.run.status === "failed" && !data.analysis && !analyzing) {
      runAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.run.status, data?.analysis]);

  const handleReplay = async () => {
    if (!data) return;
    await replay.start(`/api/runs/${data.run.id}/replay`, {});
    load();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-white/40">
        <Loader2 size={18} className="animate-spin" /> 불러오는 중…
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="glass-panel p-8 text-center text-sm text-danger">{loadError ?? "실행 기록을 찾을 수 없습니다."}</div>
    );
  }

  const { run, events, analysis, replay: replayRecord } = data;
  const selectedEvent = events.find((e) => e.step === selectedStep);

  return (
    <div className="space-y-6">
      <Link href="/traces" className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70">
        <ArrowLeft size={14} /> Traces
      </Link>

      <div className="glass-panel p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-white">Agent Execution Trace</h1>
            <p className="text-xs text-white/40">
              Session #{shortId(run.id)} · {formatDateTime(run.startedAt)}
            </p>
          </div>
          <RunStatusPill status={run.status} />
        </div>

        <div className="mb-2 overflow-x-auto">
          <AgentExecutionFlow events={events} selectedStep={selectedStep} onStepClick={setSelectedStep} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="glass-panel overflow-hidden">
            <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-3 pt-2">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition-colors",
                    tab === t.id ? "border-cyan text-cyan" : "border-transparent text-white/40 hover:text-white/70"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "timeline" && (
              <TraceTimeline events={events} onSelect={setSelectedStep} selectedStep={selectedStep} />
            )}
            {tab === "logs" && <TraceLogTable events={events} />}
            {tab === "tool_calls" && <ToolCallsTab events={events} />}
            {tab === "state" && <StateTab run={run} events={events} replay={replayRecord} />}
            {tab === "artifacts" && <ArtifactsTab events={events} />}
          </div>

          {selectedStep && <StepDetails step={selectedStep} event={selectedEvent} />}
        </div>

        <div className="space-y-4">
          {run.status === "failed" && <FailureAlert />}
          {run.status === "failed" && (analyzing || analysis) && (
            <RootCausePanel analysis={analysis} loading={analyzing} />
          )}
          {analysis && !replayRecord && (
            <RecommendedFixPanel
              analysis={analysis}
              onFixReplay={handleReplay}
              replaying={replay.isStreaming}
              disabled={replay.isStreaming}
            />
          )}

          {replayRecord && replay.run && replay.run.status !== "running" && (
            <>
              <ReplayComparison before={{ run, events }} after={{ run: replay.run, events: replay.events }} />
              <Link
                href={`/traces/${replayRecord.replayRunId}`}
                className="btn-secondary w-full !justify-between"
              >
                Replay Trace 보기 <ExternalLink size={14} />
              </Link>
            </>
          )}

          {replayRecord && !replay.run && (
            <Link href={`/traces/${replayRecord.replayRunId}`} className="btn-secondary w-full !justify-between">
              이전에 생성된 Replay Trace 보기 <ExternalLink size={14} />
            </Link>
          )}

          {run.status === "completed" && !replayRecord && (
            <div className="glass-panel p-5 text-sm text-white/45">
              이 실행은 오류 없이 성공적으로 완료되었습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolCallsTab({ events }: { events: RunWithDetails["events"] }) {
  const calls = events.filter((e) => e.toolName);
  if (calls.length === 0) {
    return <div className="p-8 text-center text-sm text-white/40">기록된 Tool Call이 없습니다.</div>;
  }
  return (
    <div className="divide-y divide-white/5">
      {calls.map((e) => (
        <div key={e.id} className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-white/85">{e.toolName}</span>
            <span className={cn("text-xs font-medium", e.status === "failed" ? "text-danger" : "text-success")}>
              {e.status}
            </span>
          </div>
          <pre className="code-block mb-2 whitespace-pre-wrap break-words">
            {JSON.stringify(e.input ?? {}, null, 2)}
          </pre>
          <pre className="code-block whitespace-pre-wrap break-words">
            {JSON.stringify(e.output ?? e.error ?? {}, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}

function StateTab({ run, events, replay }: { run: RunWithDetails["run"]; events: RunWithDetails["events"]; replay: RunWithDetails["replay"] }) {
  const state = {
    runId: run.id,
    status: run.status,
    scenario: run.scenario,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    durationMs: run.durationMs,
    steps: events.map((e) => ({ step: e.step, status: e.status })),
    replay: replay ? { replayRunId: replay.replayRunId, fixApplied: replay.fixApplied } : null,
  };
  return (
    <div className="p-4">
      <pre className="code-block whitespace-pre-wrap break-words">{JSON.stringify(state, null, 2)}</pre>
    </div>
  );
}

function ArtifactsTab({ events }: { events: RunWithDetails["events"] }) {
  const search = events.find((e) => e.step === "search");
  const result = events.find((e) => e.step === "result");
  const searchResults = (search?.output as { results?: unknown[] } | undefined)?.results ?? [];
  const searchSource = (search?.output as { source?: string } | undefined)?.source;
  const answer = (result?.output as { answer?: string } | undefined)?.answer;
  const generatedBy = (result?.output as { generatedBy?: string } | undefined)?.generatedBy;

  if (searchResults.length === 0 && !answer) {
    return <div className="p-8 text-center text-sm text-white/40">생성된 아티팩트가 없습니다.</div>;
  }

  return (
    <div className="space-y-4 p-4">
      {searchResults.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-white/40">Search Results</h4>
            {searchSource && (
              <span className="text-[10px] text-white/30">
                {searchSource === "tavily" ? "Real results via Tavily" : "Simulated (mock) results"}
              </span>
            )}
          </div>
          <pre className="code-block whitespace-pre-wrap break-words">{JSON.stringify(searchResults, null, 2)}</pre>
        </div>
      )}
      {answer && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-white/40">Final Answer</h4>
            {generatedBy && (
              <span className="text-[10px] text-white/30">
                {generatedBy === "openai" ? "Generated by OpenAI" : "Generated by mock answer engine"}
              </span>
            )}
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm leading-relaxed text-white/80 whitespace-pre-wrap">
            {answer}
          </div>
        </div>
      )}
    </div>
  );
}
