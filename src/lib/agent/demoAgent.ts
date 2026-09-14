import type { Scenario, StepName, TraceError, TraceEvent } from "@/lib/types";
import { buildPlan, buildSearchResults } from "@/lib/agent/mockData";
import { generateFinalAnswer } from "@/lib/ai/generateAnswer";

export interface RunAgentOptions {
  runId: string;
  userRequest: string;
  scenario: Scenario;
  /** When present, the run represents a Fix & Replay attempt and the failing
   * step is forced to succeed using the applied configuration patch. */
  fixApplied?: Record<string, unknown> | null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(base: number, spread: number) {
  return Math.round(base + (Math.random() - 0.5) * spread);
}

function eventId(runId: string, step: StepName) {
  return `${runId}::${step}`;
}

function toolCallError(scenario: Scenario): TraceError | null {
  switch (scenario) {
    case "auth_error":
      return {
        type: "AUTH_ERROR",
        tool: "ExternalMarketAPI",
        status: 401,
        message: "Unauthorized: access token is invalid or expired.",
      };
    case "outdated_source":
      return {
        type: "OUTDATED_SOURCE",
        tool: "SourceValidationTool",
        status: 422,
        message:
          "Source freshness validation failed: retrieved sources exceed the 6-month recency threshold.",
      };
    case "tool_timeout":
      return {
        type: "TIMEOUT_ERROR",
        tool: "ExternalMarketAPI",
        status: 504,
        message: "Request timed out after 10000ms with no response from the external API.",
      };
    default:
      return null;
  }
}

/**
 * Simulated demo agent used to power the Playground / Fix & Replay flow.
 * Yields a "running" TraceEvent when a step starts and a terminal TraceEvent
 * (completed / failed / skipped) when it finishes, mirroring how a real
 * Tool-Calling agent would be observed from the outside.
 */
export async function* runDemoAgent(
  opts: RunAgentOptions
): AsyncGenerator<TraceEvent, void, unknown> {
  const { runId, userRequest, scenario, fixApplied } = opts;
  const isFixed = Boolean(fixApplied);

  // --- Step 1: User Request -------------------------------------------------
  {
    const startedAt = new Date().toISOString();
    yield {
      id: eventId(runId, "user_request"),
      runId,
      step: "user_request",
      status: "running",
      input: { userRequest },
      startedAt,
    };
    await sleep(jitter(350, 150));
    const completedAt = new Date().toISOString();
    yield {
      id: eventId(runId, "user_request"),
      runId,
      step: "user_request",
      status: "completed",
      input: { userRequest },
      output: { received: true, requestLength: userRequest.length },
      startedAt,
      completedAt,
      durationMs: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
    };
  }

  // --- Step 2: Plan -----------------------------------------------------------
  const plan = buildPlan(userRequest);
  {
    const startedAt = new Date().toISOString();
    yield {
      id: eventId(runId, "plan"),
      runId,
      step: "plan",
      status: "running",
      input: { userRequest },
      startedAt,
    };
    await sleep(jitter(1100, 400));
    const completedAt = new Date().toISOString();
    yield {
      id: eventId(runId, "plan"),
      runId,
      step: "plan",
      status: "completed",
      input: { userRequest },
      output: { steps: plan, stepCount: plan.length },
      startedAt,
      completedAt,
      durationMs: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
    };
  }

  // --- Step 3: Search -----------------------------------------------------------
  const results = buildSearchResults(userRequest, isFixed ? "normal" : scenario);
  {
    const startedAt = new Date().toISOString();
    yield {
      id: eventId(runId, "search"),
      runId,
      step: "search",
      status: "running",
      toolName: "WebSearchTool",
      input: { query: userRequest },
      startedAt,
    };
    await sleep(jitter(1700, 600));
    const completedAt = new Date().toISOString();
    yield {
      id: eventId(runId, "search"),
      runId,
      step: "search",
      status: "completed",
      toolName: "WebSearchTool",
      input: { query: userRequest },
      output: { resultCount: results.length, results },
      startedAt,
      completedAt,
      durationMs: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
    };
  }

  // --- Step 4: Tool Call -----------------------------------------------------------
  const error = isFixed ? null : toolCallError(scenario);
  const toolName =
    scenario === "outdated_source" && !isFixed ? "SourceValidationTool" : "ExternalMarketAPI";
  {
    const startedAt = new Date().toISOString();
    yield {
      id: eventId(runId, "tool_call"),
      runId,
      step: "tool_call",
      status: "running",
      toolName,
      input: { endpoint: "/v1/market-data", params: { topic: userRequest }, auth: isFixed ? "valid_token" : fixApplied?.authentication ?? "session_token" },
      startedAt,
    };

    const baseWait = scenario === "tool_timeout" && !isFixed ? 3800 : 1400;
    await sleep(jitter(baseWait, 400));
    const completedAt = new Date().toISOString();
    const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();

    if (error) {
      yield {
        id: eventId(runId, "tool_call"),
        runId,
        step: "tool_call",
        status: "failed",
        toolName,
        input: { endpoint: "/v1/market-data", params: { topic: userRequest } },
        error,
        startedAt,
        completedAt,
        durationMs,
      };

      // Result step is never reached once the tool call fails.
      yield {
        id: eventId(runId, "result"),
        runId,
        step: "result",
        status: "skipped",
        startedAt: completedAt,
        completedAt,
        durationMs: 0,
      };
      return;
    }

    yield {
      id: eventId(runId, "tool_call"),
      runId,
      step: "tool_call",
      status: "completed",
      toolName,
      input: { endpoint: "/v1/market-data", params: { topic: userRequest } },
      output: {
        status: 200,
        data: { marketSignals: "stable", dataPoints: results.length, freshnessValidated: true },
      },
      startedAt,
      completedAt,
      durationMs,
    };
  }

  // --- Step 5: Result -----------------------------------------------------------
  {
    const startedAt = new Date().toISOString();
    yield {
      id: eventId(runId, "result"),
      runId,
      step: "result",
      status: "running",
      startedAt,
    };
    const { answer, source: answerSource } = await generateFinalAnswer(userRequest, results);
    const completedAt = new Date().toISOString();
    yield {
      id: eventId(runId, "result"),
      runId,
      step: "result",
      status: "completed",
      output: { answer, generatedBy: answerSource },
      startedAt,
      completedAt,
      durationMs: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
    };
  }
}

/** Derives the configuration patch that Fix & Replay applies for a given failure type. */
export function buildFixForScenario(scenario: Scenario): Record<string, unknown> {
  switch (scenario) {
    case "auth_error":
      return { authentication: "valid_token", tokenRefreshed: true };
    case "outdated_source":
      return { sourceFreshnessValidation: true, maxSourceAgeMonths: 6, sourcesRefetched: true };
    case "tool_timeout":
      return { timeoutMs: 30000, retryPolicy: "exponential-backoff", retries: 2 };
    default:
      return {};
  }
}
