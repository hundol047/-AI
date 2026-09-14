import { z } from "zod";
import type { AgentRun, FailureAnalysis, TraceEvent } from "@/lib/types";

export const analysisSchema = z.object({
  failureType: z.string().describe("Short machine-readable failure category, e.g. AUTH_ERROR"),
  rootCause: z.string().describe("One or two sentence root cause, in Korean"),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
  explanation: z.string().describe("Longer explanation of impact and context, in Korean"),
  recommendedFix: z.string().describe("Actionable recommended fix, in Korean"),
  fixSteps: z.array(z.string()).describe("Ordered list of concrete remediation steps, in Korean"),
  patchSuggestion: z.string().describe("Small illustrative code/config patch snippet"),
});

export type AnalysisResult = z.infer<typeof analysisSchema>;

interface AnalyzeInput {
  run: AgentRun;
  events: TraceEvent[];
}

/**
 * Builds a prompt strictly from observable execution data (step names, tool
 * I/O, HTTP status, error messages, timestamps). We never ask the model for
 * -- and never surface -- any hidden chain-of-thought; only a structured,
 * user-facing analysis of what is visible on the wire.
 */
function buildObservationContext({ run, events }: AnalyzeInput) {
  const failedEvent = events.find((e) => e.status === "failed");
  const priorSteps = events
    .filter((e) => e.step !== failedEvent?.step)
    .map((e) => ({
      step: e.step,
      status: e.status,
      toolName: e.toolName,
      durationMs: e.durationMs,
    }));

  return {
    userRequest: run.userRequest,
    scenario: run.scenario,
    priorSteps,
    failedStep: failedEvent
      ? {
          step: failedEvent.step,
          toolName: failedEvent.toolName,
          input: failedEvent.input,
          httpStatus: failedEvent.error?.status,
          errorType: failedEvent.error?.type,
          errorMessage: failedEvent.error?.message,
          startedAt: failedEvent.startedAt,
          completedAt: failedEvent.completedAt,
          durationMs: failedEvent.durationMs,
        }
      : null,
  };
}

function mockAnalyze(input: AnalyzeInput): AnalysisResult {
  const errorType = input.events.find((e) => e.status === "failed")?.error?.type ?? "UNKNOWN_ERROR";

  const presets: Record<string, AnalysisResult> = {
    AUTH_ERROR: {
      failureType: "AUTH_ERROR",
      rootCause:
        "External API authentication token이 만료되어 401 Unauthorized 오류가 발생했습니다.",
      riskLevel: "HIGH",
      explanation:
        "Tool Call 단계에서 외부 시장 데이터 API를 호출할 때 사용한 액세스 토큰이 만료되었거나 유효하지 않아 인증에 실패했습니다. 동일한 토큰을 사용하는 다른 API 호출에서도 연쇄적으로 실패할 수 있습니다.",
      recommendedFix:
        "API 호출 전에 토큰 유효성을 검사하고, 만료된 경우 refresh token을 이용해 갱신하세요.",
      fixSteps: [
        "현재 액세스 토큰의 만료 시각을 확인합니다.",
        "refresh token을 사용하여 새 액세스 토큰을 발급받습니다.",
        "갱신된 토큰으로 API를 재호출합니다.",
        "토큰 자동 갱신 로직을 Tool Call 실행 전 단계에 추가합니다.",
      ],
      patchSuggestion:
        "// 토큰 갱신 후 API 재호출\nconst newToken = await refreshAccessToken();\nconst response = await fetch(url, {\n  headers: { Authorization: `Bearer ${newToken}` },\n});",
    },
    OUTDATED_SOURCE: {
      failureType: "OUTDATED_SOURCE",
      rootCause: "검색된 소스의 최신성 검증(freshness validation)이 누락되어 오래된 데이터가 사용되었습니다.",
      riskLevel: "HIGH",
      explanation:
        "Search 단계에서 수집한 소스 중 일부가 6개월 기준을 초과한 오래된 자료였고, 이를 걸러내는 검증 로직이 없어 Tool Call 단계에서 검증 오류가 발생했습니다. 이는 부정확하거나 오래된 정보가 최종 답변에 포함될 위험으로 이어질 수 있습니다.",
      recommendedFix:
        "Tool Call 이전에 소스의 발행일을 확인하여 6개월이 지난 자료는 제외하도록 필터링 로직을 추가하세요.",
      fixSteps: [
        "각 검색 결과의 publishedAt 값을 확인합니다.",
        "6개월(180일)을 초과한 소스를 결과 집합에서 제외합니다.",
        "필터링 후 남은 소스 수가 최소 기준(예: 1개 이상)을 충족하는지 확인합니다.",
        "부족할 경우 검색 쿼리를 조정해 재검색합니다.",
      ],
      patchSuggestion:
        "if (source.publishedAt < sixMonthsAgo) {\n  continue; // filter out outdated sources\n}",
    },
    TIMEOUT_ERROR: {
      failureType: "TIMEOUT_ERROR",
      rootCause: "외부 API가 지정된 시간 내에 응답하지 않아 요청이 타임아웃되었습니다.",
      riskLevel: "MEDIUM",
      explanation:
        "Tool Call 단계에서 ExternalMarketAPI 호출이 10000ms 내에 응답을 반환하지 않았습니다. 네트워크 지연, 외부 서비스 부하, 혹은 과도하게 짧은 타임아웃 설정이 원인일 수 있습니다.",
      recommendedFix: "타임아웃 값을 늘리고, 지수 백오프(exponential backoff) 재시도 정책을 적용하세요.",
      fixSteps: [
        "타임아웃 임계값을 10000ms에서 30000ms로 상향 조정합니다.",
        "실패 시 최대 2회까지 지수 백오프로 재시도합니다.",
        "재시도 이후에도 실패하면 사용자에게 명확한 오류 메시지를 반환합니다.",
      ],
      patchSuggestion:
        "const response = await fetchWithRetry(url, {\n  timeoutMs: 30000,\n  retries: 2,\n  backoff: 'exponential',\n});",
    },
    UNKNOWN_ERROR: {
      failureType: "UNKNOWN_ERROR",
      rootCause: "실행 중 예기치 않은 오류가 발생했습니다.",
      riskLevel: "MEDIUM",
      explanation: "관측된 로그만으로는 정확한 원인을 특정하기 어렵습니다. 추가 로그 수집이 필요합니다.",
      recommendedFix: "실패한 단계의 입력/출력 로그를 추가로 수집하고 재현 테스트를 진행하세요.",
      fixSteps: ["실패 단계의 상세 로그를 확인합니다.", "동일한 입력으로 재현을 시도합니다."],
      patchSuggestion: "// 추가 로깅을 통해 원인을 특정하세요.",
    },
  };

  return presets[errorType] ?? (presets.UNKNOWN_ERROR as AnalysisResult);
}

export async function analyzeFailure(input: AnalyzeInput): Promise<{
  result: AnalysisResult;
  source: FailureAnalysis["source"];
}> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { result: mockAnalyze(input), source: "mock" };
  }

  try {
    const [{ generateObject }, { createOpenAI }] = await Promise.all([
      import("ai"),
      import("@ai-sdk/openai"),
    ]);
    const openai = createOpenAI({ apiKey });
    const context = buildObservationContext(input);

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: analysisSchema,
      system:
        "You are TraceAgent's Root Cause Analysis engine for an AI agent observability platform. " +
        "You only analyze OBSERVABLE execution telemetry: step names, tool names, tool inputs/outputs, " +
        "HTTP status codes, error messages, and timestamps. You never request or reveal any model's " +
        "private chain-of-thought reasoning. Respond ONLY with the structured JSON object matching the " +
        "provided schema. Write all human-readable text fields (rootCause, explanation, recommendedFix, " +
        "fixSteps) in Korean, concise and actionable, suitable for a software engineer debugging a " +
        "production AI agent.",
      prompt: `다음은 실패한 AI 에이전트 실행의 관측 데이터입니다. 이 데이터만을 근거로 원인을 분석하세요.\n\n${JSON.stringify(
        context,
        null,
        2
      )}`,
    });

    return { result: object, source: "openai" };
  } catch (err) {
    console.error("[analyzeFailure] OpenAI call failed, falling back to mock analyzer:", err);
    return { result: mockAnalyze(input), source: "mock" };
  }
}
