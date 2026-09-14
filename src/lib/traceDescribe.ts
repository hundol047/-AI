import type { LogLine, TraceEvent } from "@/lib/types";

interface SearchOutput {
  resultCount?: number;
}
interface PlanOutput {
  stepCount?: number;
}
interface ToolCallOutput {
  status?: number;
}

export function describeEvent(event: TraceEvent): string {
  const output = (event.output ?? {}) as SearchOutput & PlanOutput & ToolCallOutput;
  switch (event.step) {
    case "user_request":
      return typeof event.input === "object" && event.input && "userRequest" in event.input
        ? String((event.input as { userRequest?: string }).userRequest ?? "").slice(0, 80)
        : "사용자 요청 수신";
    case "plan":
      return event.status === "completed" ? `${output.stepCount ?? "-"}-step plan created` : "작업 계획 수립 중";
    case "search":
      if (event.status === "completed") return `Searching complete — ${output.resultCount ?? 0} sources found`;
      return `Searching for related sources (${event.toolName ?? "WebSearchTool"})`;
    case "tool_call":
      if (event.status === "failed") {
        return `${event.toolName ?? "External Tool"} 호출 실패 — ${event.error?.message ?? "Unknown error"}`;
      }
      if (event.status === "completed") return `${event.toolName ?? "External Tool"} call succeeded`;
      return `Calling ${event.toolName ?? "external tool"}…`;
    case "result":
      if (event.status === "skipped") return "이전 단계 오류로 인해 결과가 생성되지 않았습니다.";
      if (event.status === "completed") return "최종 답변 생성 완료";
      return "최종 답변 생성 중";
    default:
      return "";
  }
}

export function eventsToLogLines(events: TraceEvent[]): LogLine[] {
  const lines: LogLine[] = [];
  for (const e of events) {
    if (e.status === "running") {
      lines.push({ time: e.startedAt, level: "INFO", step: e.step, message: `${describeEvent(e)}` });
      continue;
    }
    if (e.status === "completed") {
      lines.push({
        time: e.completedAt ?? e.startedAt,
        level: "INFO",
        step: e.step,
        message: describeEvent(e),
      });
    }
    if (e.status === "failed") {
      lines.push({
        time: e.completedAt ?? e.startedAt,
        level: "ERROR",
        step: e.step,
        message: `${e.toolName ?? "Tool"} call failed`,
      });
      if (e.error) {
        lines.push({
          time: e.completedAt ?? e.startedAt,
          level: "ERROR",
          step: e.step,
          message: `${e.error.status ? `${e.error.status} ` : ""}${e.error.message}`,
        });
        lines.push({
          time: e.completedAt ?? e.startedAt,
          level: "ERROR",
          step: "Agent",
          message: `${e.error.type} detected. Halting downstream steps.`,
        });
      }
    }
    if (e.status === "skipped") {
      lines.push({
        time: e.completedAt ?? e.startedAt,
        level: "WARN",
        step: "Retry",
        message: "Result step skipped — upstream failure not recovered.",
      });
    }
  }
  return lines.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}
