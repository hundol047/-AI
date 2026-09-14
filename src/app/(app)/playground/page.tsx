"use client";

import { useCallback, useEffect, useState } from "react";
import { Play, Loader2, RotateCcw, FlaskConical } from "lucide-react";
import { AgentExecutionFlow } from "@/components/trace/AgentExecutionFlow";
import { TraceTimeline } from "@/components/trace/TraceTimeline";
import { StepDetails } from "@/components/trace/StepDetails";
import { FailureAlert } from "@/components/trace/FailureAlert";
import { RootCausePanel } from "@/components/trace/RootCausePanel";
import { RecommendedFixPanel } from "@/components/trace/RecommendedFixPanel";
import { ReplayComparison } from "@/components/trace/ReplayComparison";
import { ScenarioSelector } from "@/components/common/ScenarioSelector";
import { useRunStream } from "@/hooks/useRunStream";
import type { FailureAnalysis, Scenario, StepName } from "@/lib/types";

const DEFAULT_REQUEST = "지난 6개월간 EV 시장 동향을 분석해줘.";

export default function PlaygroundPage() {
  const [userRequest, setUserRequest] = useState(DEFAULT_REQUEST);
  const [scenario, setScenario] = useState<Scenario>("auth_error");
  const [selectedStep, setSelectedStep] = useState<StepName | null>(null);

  const mainRun = useRunStream();
  const replayRun = useRunStream();

  const [analysis, setAnalysis] = useState<FailureAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const hasFailed = mainRun.run?.status === "failed";
  const isBusy = mainRun.isStreaming || replayRun.isStreaming;

  const runAnalysis = useCallback(async (runId: string) => {
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await fetch(`/api/runs/${runId}/analyze`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "분석에 실패했습니다.");
      setAnalysis(data.analysis as FailureAnalysis);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "분석에 실패했습니다.");
    } finally {
      setAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    if (hasFailed && mainRun.run && !analysis && !analyzing && !analyzeError) {
      runAnalysis(mainRun.run.id);
    }
  }, [hasFailed, mainRun.run, analysis, analyzing, analyzeError, runAnalysis]);

  const handleRun = async () => {
    setSelectedStep(null);
    setAnalysis(null);
    setAnalyzeError(null);
    replayRun.reset();
    await mainRun.start("/api/runs", { userRequest, scenario });
  };

  const handleReplay = async () => {
    if (!mainRun.run) return;
    await replayRun.start(`/api/runs/${mainRun.run.id}/replay`, {});
  };

  const handleReset = () => {
    mainRun.reset();
    replayRun.reset();
    setAnalysis(null);
    setAnalyzeError(null);
    setSelectedStep(null);
  };

  const activeEvents = mainRun.events;
  const selectedEvent = activeEvents.find((e) => e.step === selectedStep);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan/30 bg-cyan/10 text-cyan">
          <FlaskConical size={20} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-white">Playground</h1>
          <p className="text-sm text-white/45">AI 에이전트를 직접 실행하고 실시간 실행 흐름을 확인하세요.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left / main column */}
        <div className="space-y-6 lg:col-span-2">
          <div className="glass-panel space-y-4 p-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">사용자 요청</label>
              <textarea
                value={userRequest}
                onChange={(e) => setUserRequest(e.target.value)}
                disabled={isBusy}
                rows={2}
                placeholder="예: 최근 AI 시장 동향을 조사해서 핵심 내용을 정리해줘."
                className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-sm text-white/90 outline-none transition-colors placeholder:text-white/25 focus:border-cyan/40 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Demo Scenario</label>
              <ScenarioSelector value={scenario} onChange={setScenario} disabled={isBusy} />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleRun}
                disabled={isBusy || !userRequest.trim()}
                className="btn-primary flex-1"
              >
                {mainRun.isStreaming ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                {mainRun.isStreaming ? "Agent 실행 중…" : "Run Agent"}
              </button>
              {mainRun.run && (
                <button type="button" onClick={handleReset} disabled={isBusy} className="btn-secondary">
                  <RotateCcw size={16} />
                </button>
              )}
            </div>
            {mainRun.error && <p className="text-xs text-danger">{mainRun.error}</p>}
          </div>

          {mainRun.run && (
            <div className="glass-panel animate-fade-in p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Execution Timeline</h2>
                <span className="text-xs text-white/40">Run #{mainRun.run.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="mb-5 overflow-x-auto">
                <AgentExecutionFlow events={activeEvents} selectedStep={selectedStep} onStepClick={setSelectedStep} />
              </div>
              <div className="glass-card overflow-hidden">
                <TraceTimeline events={activeEvents} onSelect={setSelectedStep} selectedStep={selectedStep} />
              </div>
            </div>
          )}

          {selectedStep && (
            <div className="animate-fade-in">
              <StepDetails step={selectedStep} event={selectedEvent} />
            </div>
          )}

          {replayRun.run && (
            <div className="glass-panel animate-fade-in border-success/25 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Replay Run</h2>
                <span className="text-xs text-white/40">Run #{replayRun.run.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="overflow-x-auto">
                <AgentExecutionFlow events={replayRun.events} />
              </div>
            </div>
          )}
        </div>

        {/* Right / analysis column */}
        <div className="space-y-4">
          {mainRun.isStreaming && !hasFailed && (
            <div className="glass-panel flex items-center gap-3 p-5 text-sm text-white/50">
              <Loader2 size={16} className="animate-spin text-cyan" />
              에이전트가 요청을 처리하고 있습니다…
            </div>
          )}

          {hasFailed && <FailureAlert />}

          {hasFailed && (analyzing || analysis) && <RootCausePanel analysis={analysis} loading={analyzing} />}
          {analyzeError && <p className="text-xs text-danger">{analyzeError}</p>}

          {analysis && mainRun.run && !replayRun.run && (
            <RecommendedFixPanel
              analysis={analysis}
              onFixReplay={handleReplay}
              replaying={replayRun.isStreaming}
              disabled={isBusy}
            />
          )}

          {mainRun.run && replayRun.run && replayRun.run.status !== "running" && (
            <ReplayComparison
              before={{ run: mainRun.run, events: mainRun.events }}
              after={{ run: replayRun.run, events: replayRun.events }}
            />
          )}

          {!mainRun.run && (
            <div className="glass-panel p-5 text-sm leading-relaxed text-white/45">
              <p className="mb-2 font-semibold text-white/70">사용 방법</p>
              <ol className="list-inside list-decimal space-y-1.5">
                <li>사용자 요청을 입력하세요.</li>
                <li>Demo Scenario를 선택하세요 (오류를 의도적으로 재현할 수 있습니다).</li>
                <li>Run Agent를 눌러 실시간 실행 흐름을 확인하세요.</li>
                <li>오류가 발생하면 TraceAgent가 자동으로 원인을 분석합니다.</li>
                <li>Fix & Replay로 수정 후 재실행 결과를 비교하세요.</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
