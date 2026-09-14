import Link from "next/link";
import { ArrowRight, PlayCircle, Route, ShieldAlert, Brain, RotateCw } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { AgentExecutionFlow } from "@/components/trace/AgentExecutionFlow";
import { FailureAlert } from "@/components/trace/FailureAlert";
import { RootCausePanel } from "@/components/trace/RootCausePanel";
import { RecommendedFixPanel } from "@/components/trace/RecommendedFixPanel";
import { RunStatusPill } from "@/components/common/RunStatusBadge";
import type { FailureAnalysis, TraceEvent } from "@/lib/types";

const HERO_RUN_ID = "landing-demo";

const HERO_EVENTS: TraceEvent[] = [
  {
    id: "1",
    runId: HERO_RUN_ID,
    step: "user_request",
    status: "completed",
    startedAt: "2025-06-24T14:32:01Z",
    completedAt: "2025-06-24T14:32:03Z",
    durationMs: 2100,
    input: { userRequest: "지난 6개월간 EV 시장 동향을 분석해줘." },
  },
  {
    id: "2",
    runId: HERO_RUN_ID,
    step: "plan",
    status: "completed",
    startedAt: "2025-06-24T14:32:03Z",
    completedAt: "2025-06-24T14:32:04.8Z",
    durationMs: 1800,
    output: { stepCount: 4 },
  },
  {
    id: "3",
    runId: HERO_RUN_ID,
    step: "search",
    status: "completed",
    toolName: "WebSearchTool",
    startedAt: "2025-06-24T14:32:05Z",
    completedAt: "2025-06-24T14:32:09.8Z",
    durationMs: 4800,
    output: { resultCount: 3 },
  },
  {
    id: "4",
    runId: HERO_RUN_ID,
    step: "tool_call",
    status: "failed",
    toolName: "ExternalMarketAPI",
    startedAt: "2025-06-24T14:32:10Z",
    completedAt: "2025-06-24T14:32:13.2Z",
    durationMs: 3200,
    error: { type: "AUTH_ERROR", tool: "ExternalMarketAPI", status: 401, message: "Unauthorized" },
  },
  { id: "5", runId: HERO_RUN_ID, step: "result", status: "skipped", startedAt: "2025-06-24T14:32:13.2Z" },
];

const HERO_ANALYSIS: FailureAnalysis = {
  id: "hero",
  runId: HERO_RUN_ID,
  failureType: "AUTH_ERROR",
  rootCause: "External API authentication token이 만료되어 401 Unauthorized 오류가 발생했습니다.",
  riskLevel: "HIGH",
  explanation:
    "동일한 토큰을 사용하는 다른 API 호출에서도 연쇄적으로 실패할 수 있습니다.",
  recommendedFix: "API 호출 전에 토큰 유효성을 검사하고, 만료된 경우 refresh token을 이용해 갱신하세요.",
  fixSteps: [],
  patchSuggestion: "",
  createdAt: "",
  source: "mock",
};

const FEATURES = [
  {
    no: "01",
    title: "실행 흐름 추적",
    desc: "User Request부터 Result까지, AI 에이전트의 모든 단계와 Tool Call을 실시간으로 기록합니다.",
    icon: Route,
  },
  {
    no: "02",
    title: "오류 자동 감지",
    desc: "실행 중 오류가 발생하면 즉시 실패 지점을 포착하고 Failure 상태로 전환합니다.",
    icon: ShieldAlert,
  },
  {
    no: "03",
    title: "AI 원인 분석",
    desc: "관측 가능한 실행 데이터를 기반으로 근본 원인과 위험도, 개선안을 자동으로 제시합니다.",
    icon: Brain,
  },
  {
    no: "04",
    title: "수정 후 재실행",
    desc: "추천 수정안을 적용해 즉시 재실행하고, 이전 실행과의 결과를 비교·검증합니다.",
    icon: RotateCw,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="animate-fade-in">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan/25 bg-cyan/[0.06] px-3 py-1 text-xs text-cyan/90">
              TRACE · UNDERSTAND · DEBUG · MAKE AI RELIABLE
            </div>
            <h1 className="text-lg font-semibold text-white/60">TraceAgent</h1>
            <p className="mt-1 text-sm text-white/45">
              AI 에이전트의 실행 과정을 추적하고 오류 원인을 분석하는 AI 블랙박스
            </p>

            <h2 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
              보이지 않는
              <br />
              <span className="text-gradient">AI의 실행 흐름을,</span>
              <br />
              명확하게 추적합니다.
            </h2>

            <p className="mt-5 max-w-md text-sm leading-relaxed text-white/50">
              추측이 아닌 데이터로,
              <br />더 신뢰할 수 있는 AI 에이전트를 만드세요.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/playground" className="btn-primary">
                무료로 시작하기 <ArrowRight size={16} />
              </Link>
              <Link href="/playground" className="btn-secondary">
                <PlayCircle size={16} /> 데모 실행하기
              </Link>
            </div>
          </div>

          {/* Mock Trace Dashboard */}
          <div className="animate-slide-up">
            <div className="glass-panel overflow-hidden p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">Agent Execution Trace</div>
                  <div className="text-[11px] text-white/40">Session #7A3F2C</div>
                </div>
                <RunStatusPill status="failed" />
              </div>

              <div className="mb-5 overflow-x-auto">
                <AgentExecutionFlow events={HERO_EVENTS} compact />
              </div>

              <div className="space-y-3">
                <FailureAlert message="The agent encountered an error during tool execution." />
                <RootCausePanel analysis={HERO_ANALYSIS} />
                <RecommendedFixPanel analysis={{ ...HERO_ANALYSIS, fixSteps: [], patchSuggestion: "" }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-white/[0.06] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-2xl">
            <h3 className="text-2xl font-bold text-white sm:text-3xl">핵심 기능</h3>
            <p className="mt-2 text-sm text-white/50">
              STEP 1 사용자 요청 입력부터 STEP 6 Before/After 비교까지, TraceAgent가 전 과정을 담당합니다.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.no} className="glass-card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-mono text-cyan/60">{f.no}</span>
                  <f.icon size={20} className="text-cyan" />
                </div>
                <h4 className="mb-1.5 text-sm font-semibold text-white">{f.title}</h4>
                <p className="text-xs leading-relaxed text-white/50">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases / CTA */}
      <section id="use-cases" className="border-t border-white/[0.06] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="glass-panel flex flex-col items-center gap-6 p-10 text-center sm:p-14">
            <h3 className="text-2xl font-bold text-white sm:text-3xl">
              1분 안에 TraceAgent의 가치를 확인하세요.
            </h3>
            <p className="max-w-xl text-sm text-white/50">
              Playground에서 직접 에이전트를 실행하고, 오류가 발생했을 때 TraceAgent가 어떻게 원인을 분석하고
              수정 후 재실행까지 자동으로 검증하는지 체험해보세요.
            </p>
            <Link href="/playground" className="btn-primary">
              Playground 열기 <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] px-4 py-8 text-center text-xs text-white/30 sm:px-6 lg:px-8">
        A MORE RELIABLE AI WORLD — TraceAgent
      </footer>
    </div>
  );
}
