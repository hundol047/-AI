export type StepName = "user_request" | "plan" | "search" | "tool_call" | "result";

export type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export type RunStatus = "running" | "completed" | "failed";

export type Scenario =
  | "normal"
  | "auth_error"
  | "outdated_source"
  | "tool_timeout";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type LogLevel = "INFO" | "WARN" | "ERROR";

export interface TraceError {
  type: string;
  tool?: string;
  status?: number;
  message: string;
}

export interface TraceEvent {
  id: string;
  runId: string;
  step: StepName;
  status: StepStatus;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  error?: TraceError | null;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
}

export interface AgentRun {
  id: string;
  userRequest: string;
  status: RunStatus;
  scenario: Scenario;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  createdAt: string;
}

export interface FailureAnalysis {
  id: string;
  runId: string;
  failureType: string;
  rootCause: string;
  riskLevel: RiskLevel;
  explanation: string;
  recommendedFix: string;
  fixSteps: string[];
  patchSuggestion: string;
  createdAt: string;
  source: "openai" | "mock";
}

export interface ReplayRecord {
  id: string;
  originalRunId: string;
  replayRunId: string;
  fixApplied: Record<string, unknown>;
  createdAt: string;
}

export interface LogLine {
  time: string;
  level: LogLevel;
  step: StepName | "Agent" | "Retry";
  message: string;
}

export interface RunWithDetails {
  run: AgentRun;
  events: TraceEvent[];
  analysis: FailureAnalysis | null;
  replay: ReplayRecord | null;
}

/** NDJSON stream event shape sent from the execution API routes to the client. */
export type StreamEvent =
  | { kind: "run_created"; run: AgentRun }
  | { kind: "trace_event"; event: TraceEvent }
  | { kind: "run_updated"; run: AgentRun }
  | { kind: "done"; run: AgentRun }
  | { kind: "error"; message: string };

export const SCENARIO_LABELS: Record<Scenario, string> = {
  normal: "Normal Run",
  auth_error: "API Authentication Error",
  outdated_source: "Outdated Source Error",
  tool_timeout: "Tool Timeout",
};

export const SCENARIO_DESCRIPTIONS: Record<Scenario, string> = {
  normal: "모든 단계가 정상적으로 완료됩니다.",
  auth_error: "Tool Call 단계에서 401 Unauthorized 인증 오류가 발생합니다.",
  outdated_source: "검색된 소스가 오래되어 Tool Call 검증 단계에서 오류가 발생합니다.",
  tool_timeout: "외부 API 호출이 응답하지 않아 타임아웃 오류가 발생합니다.",
};

export const STEP_LABELS: Record<StepName, string> = {
  user_request: "User Request",
  plan: "Plan",
  search: "Search",
  tool_call: "Tool Call",
  result: "Result",
};
