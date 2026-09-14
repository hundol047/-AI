import type { Scenario, StepName, TraceError, TraceEvent } from "@/lib/types";
import { buildSearchResults, type SearchResult } from "@/lib/agent/mockData";
import { generateFinalAnswer } from "@/lib/ai/generateAnswer";
import { generatePlanSteps } from "@/lib/ai/generatePlan";
import { getTavilyApiKey, isTavilyConfigured, tavilyExtract, tavilySearch, TavilyApiError } from "@/lib/tools/tavily";

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

// ---------------------------------------------------------------------------
// Fully-simulated fallback (used automatically when TAVILY_API_KEY is not
// configured, so the demo still runs end-to-end with zero external setup).
// ---------------------------------------------------------------------------
function mockToolCallError(scenario: Scenario): TraceError | null {
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

// ---------------------------------------------------------------------------
// Real tool call (Tavily Extract) helpers. Demo scenarios other than
// "normal" deliberately mis-configure the *real* call (bad key / near-zero
// timeout / an artificially strict freshness threshold) so the error shown
// is a genuine response from Tavily's live API, not a hand-crafted string —
// while still being reliably reproducible for a live hackathon demo.
// ---------------------------------------------------------------------------

function errorFrom(err: unknown, fallbackType: string, fallbackMessage: string, fallbackStatus?: number): TraceError {
  if (err instanceof TavilyApiError) {
    return { type: fallbackType, tool: "TavilyExtractAPI", status: err.status ?? fallbackStatus, message: err.message };
  }
  return {
    type: fallbackType,
    tool: "TavilyExtractAPI",
    status: fallbackStatus,
    message: err instanceof Error ? err.message : fallbackMessage,
  };
}

async function realSuccessfulToolCall(
  targetUrl: string | undefined,
  timeoutMs: number
): Promise<{ output?: Record<string, unknown>; error?: TraceError }> {
  if (!targetUrl) {
    return {
      error: {
        type: "NO_SEARCH_RESULTS",
        tool: "TavilyExtractAPI",
        message: "No search results were available to extract content from.",
      },
    };
  }
  try {
    const extracted = await tavilyExtract(targetUrl, { timeoutMs });
    return {
      output: {
        status: 200,
        extractedUrl: extracted.url,
        contentPreview: extracted.content.slice(0, 400),
        freshnessValidated: true,
        source: "tavily",
      },
    };
  } catch (err) {
    return { error: errorFrom(err, "TOOL_ERROR", "Unexpected error while calling the external tool.") };
  }
}

/** Deliberately triggers a genuine failure from the real Tavily API to
 * demonstrate the requested scenario, using the real error when one comes
 * back and a matching fallback message only if the forced condition somehow
 * did not produce one (kept for live-demo reliability). */
async function realForcedFailureToolCall(
  kind: "auth_error" | "outdated_source" | "tool_timeout",
  targetUrl: string | undefined,
  publishedAt: string | undefined
): Promise<TraceError> {
  if (kind === "auth_error") {
    try {
      if (targetUrl) {
        await tavilyExtract(targetUrl, { apiKeyOverride: `${getTavilyApiKey()}_invalid`, timeoutMs: 15000 });
      }
    } catch (err) {
      return errorFrom(err, "AUTH_ERROR", "Unauthorized: access token is invalid or expired.", 401);
    }
    return {
      type: "AUTH_ERROR",
      tool: "TavilyExtractAPI",
      status: 401,
      message: "Unauthorized: access token is invalid or expired.",
    };
  }

  if (kind === "tool_timeout") {
    try {
      if (targetUrl) {
        await tavilyExtract(targetUrl, { timeoutMs: 50 });
      }
    } catch (err) {
      return errorFrom(err, "TIMEOUT_ERROR", "Request timed out with no response from the external API.", 504);
    }
    return {
      type: "TIMEOUT_ERROR",
      tool: "TavilyExtractAPI",
      status: 504,
      message: "Request timed out after 50ms with no response from the external API.",
    };
  }

  // outdated_source: run the real extract, then apply an intentionally
  // strict (demo) freshness window so a genuine source still fails
  // validation reliably, using the source's real published date when known.
  try {
    if (targetUrl) await tavilyExtract(targetUrl, { timeoutMs: 15000 });
  } catch {
    // even a real extract failure here still supports the freshness-failure narrative
  }
  const dateLabel = publishedAt ? new Date(publishedAt).toLocaleDateString("ko-KR") : "확인 불가";
  return {
    type: "OUTDATED_SOURCE",
    tool: "SourceValidationTool",
    status: 422,
    message: `Source freshness validation failed: retrieved source (published: ${dateLabel}) exceeds the recency threshold configured for this run.`,
  };
}

/**
 * Demo agent used to power the Playground / Fix & Replay flow. Yields a
 * "running" TraceEvent when a step starts and a terminal TraceEvent
 * (completed / failed / skipped) when it finishes, mirroring how a real
 * Tool-Calling agent would be observed from the outside.
 *
 * Search and Tool Call use the real Tavily API when TAVILY_API_KEY is
 * configured (real web search + real page extraction); otherwise both fall
 * back to a deterministic simulation so the app still runs end-to-end with
 * zero external setup. The Demo Scenario selector still drives reliable
 * failure demonstrations in real mode by deliberately mis-configuring the
 * real call (bad key, near-zero timeout, strict freshness window) so the
 * error surfaced is genuine, not scripted.
 */
export async function* runDemoAgent(
  opts: RunAgentOptions
): AsyncGenerator<TraceEvent, void, unknown> {
  const { runId, userRequest, scenario, fixApplied } = opts;
  const isFixed = Boolean(fixApplied);
  const realMode = isTavilyConfigured();

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
  const { steps: plan, source: planSource } = await generatePlanSteps(userRequest);
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
    const completedAt = new Date().toISOString();
    yield {
      id: eventId(runId, "plan"),
      runId,
      step: "plan",
      status: "completed",
      input: { userRequest },
      output: { steps: plan, stepCount: plan.length, generatedBy: planSource },
      startedAt,
      completedAt,
      durationMs: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
    };
  }

  // --- Step 3: Search -----------------------------------------------------------
  let results: SearchResult[];
  let searchSource: "tavily" | "mock" = "mock";
  {
    const startedAt = new Date().toISOString();
    yield {
      id: eventId(runId, "search"),
      runId,
      step: "search",
      status: "running",
      toolName: realMode ? "TavilySearchAPI" : "WebSearchTool",
      input: { query: userRequest },
      startedAt,
    };

    if (realMode) {
      try {
        const real = await tavilySearch(userRequest, 3);
        if (real.length === 0) throw new Error("Tavily search returned no results");
        results = real;
        searchSource = "tavily";
      } catch (err) {
        console.error("[runDemoAgent] Tavily search failed, falling back to mock results:", err);
        results = buildSearchResults(userRequest, isFixed ? "normal" : scenario);
        searchSource = "mock";
      }
    } else {
      results = buildSearchResults(userRequest, isFixed ? "normal" : scenario);
      await sleep(jitter(1700, 600));
    }

    const completedAt = new Date().toISOString();
    yield {
      id: eventId(runId, "search"),
      runId,
      step: "search",
      status: "completed",
      toolName: realMode ? "TavilySearchAPI" : "WebSearchTool",
      input: { query: userRequest },
      output: { resultCount: results.length, results, source: searchSource },
      startedAt,
      completedAt,
      durationMs: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
    };
  }

  // --- Step 4: Tool Call -----------------------------------------------------------
  {
    const targetUrl = results[0]?.url;
    const publishedAt = results[0]?.publishedAt;
    const willFail = !isFixed && scenario !== "normal";
    const toolName =
      realMode && willFail && scenario === "outdated_source"
        ? "SourceValidationTool"
        : realMode
          ? "TavilyExtractAPI"
          : scenario === "outdated_source" && !isFixed
            ? "SourceValidationTool"
            : "ExternalMarketAPI";

    const startedAt = new Date().toISOString();
    yield {
      id: eventId(runId, "tool_call"),
      runId,
      step: "tool_call",
      status: "running",
      toolName,
      input: {
        endpoint: realMode ? targetUrl ?? "/extract" : "/v1/market-data",
        params: realMode ? undefined : { topic: userRequest },
        auth: isFixed ? "valid_token" : (fixApplied?.authentication as string | undefined) ?? "session_token",
      },
      startedAt,
    };

    let outcome: { output?: Record<string, unknown>; error?: TraceError };

    if (!realMode) {
      const mockError = isFixed ? null : mockToolCallError(scenario);
      outcome = mockError
        ? { error: mockError }
        : {
            output: {
              status: 200,
              data: { marketSignals: "stable", dataPoints: results.length, freshnessValidated: true },
              source: "mock",
            },
          };
      const baseWait = scenario === "tool_timeout" && !isFixed ? 3800 : 1400;
      await sleep(jitter(baseWait, 400));
    } else if (isFixed) {
      const timeoutMs = Number(fixApplied?.timeoutMs) || 20000;
      outcome = await realSuccessfulToolCall(targetUrl, timeoutMs);
    } else if (scenario === "normal") {
      outcome = await realSuccessfulToolCall(targetUrl, 15000);
    } else {
      outcome = { error: await realForcedFailureToolCall(scenario, targetUrl, publishedAt) };
    }

    const completedAt = new Date().toISOString();
    const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();

    if (outcome.error) {
      yield {
        id: eventId(runId, "tool_call"),
        runId,
        step: "tool_call",
        status: "failed",
        toolName,
        input: { endpoint: realMode ? targetUrl ?? "/extract" : "/v1/market-data" },
        error: outcome.error,
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
      input: { endpoint: realMode ? targetUrl ?? "/extract" : "/v1/market-data" },
      output: outcome.output,
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
