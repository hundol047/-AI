"use client";

import { CheckCircle2, ClipboardList, Search, User, Wrench, Flag, AlertTriangle, Loader2, CircleDashed } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { STEP_LABELS, type StepName, type StepStatus, type TraceEvent } from "@/lib/types";

const STEP_ORDER: StepName[] = ["user_request", "plan", "search", "tool_call", "result"];

function nextStep(idx: number): StepName {
  const step = STEP_ORDER[idx + 1] ?? STEP_ORDER[STEP_ORDER.length - 1];
  return step as StepName;
}

const STEP_ICONS: Record<StepName, typeof User> = {
  user_request: User,
  plan: ClipboardList,
  search: Search,
  tool_call: Wrench,
  result: Flag,
};

function nodeClasses(status: StepStatus) {
  switch (status) {
    case "completed":
      return "border-success/60 bg-success/10 text-success shadow-glow-success";
    case "failed":
      return "border-danger/70 bg-danger/10 text-danger shadow-glow-danger animate-pulse-glow";
    case "running":
      return "border-cyan/70 bg-cyan/10 text-cyan animate-pulse-glow";
    case "skipped":
      return "border-white/10 bg-white/[0.02] text-white/25";
    default:
      return "border-white/15 bg-white/[0.02] text-white/35 border-dashed";
  }
}

function connectorClasses(from: StepStatus, to: StepStatus) {
  if (from === "failed" || to === "failed") return "bg-gradient-to-r from-danger/40 to-danger/10";
  if (from === "completed" && (to === "completed" || to === "running"))
    return "bg-gradient-to-r from-success/40 via-cyan/40 to-cyan/20";
  if (from === "completed" || to === "running") return "bg-gradient-to-r from-cyan/30 to-white/10";
  return "bg-white/10";
}

function StatusOverlay({ status }: { status: StepStatus }) {
  if (status === "running") return <Loader2 size={12} className="animate-spin" />;
  if (status === "completed") return <CheckCircle2 size={12} />;
  if (status === "failed") return <AlertTriangle size={12} />;
  if (status === "pending") return <CircleDashed size={12} className="opacity-50" />;
  return null;
}

export interface AgentExecutionFlowProps {
  events: TraceEvent[];
  selectedStep?: StepName | null;
  onStepClick?: (step: StepName) => void;
  compact?: boolean;
}

export function AgentExecutionFlow({ events, selectedStep, onStepClick, compact }: AgentExecutionFlowProps) {
  const byStep = new Map(events.map((e) => [e.step, e]));

  return (
    <div className="flex w-full items-start gap-1 overflow-x-auto pb-1 sm:gap-2">
      {STEP_ORDER.map((step, idx) => {
        const event = byStep.get(step);
        const status: StepStatus = event?.status ?? "pending";
        const Icon = STEP_ICONS[step];
        const selected = selectedStep === step;

        return (
          <div key={step} className="flex flex-1 items-start last:flex-none">
            <button
              type="button"
              onClick={() => onStepClick?.(step)}
              disabled={!onStepClick || status === "pending"}
              className={cn(
                "group flex flex-shrink-0 flex-col items-center gap-2 rounded-xl px-2 py-1 text-center transition-transform",
                onStepClick && status !== "pending" ? "cursor-pointer hover:-translate-y-0.5" : "cursor-default"
              )}
            >
              <div
                className={cn(
                  "relative flex items-center justify-center rounded-full border-2 transition-all",
                  compact ? "h-10 w-10" : "h-14 w-14",
                  nodeClasses(status),
                  selected && "ring-2 ring-cyan ring-offset-2 ring-offset-bg"
                )}
              >
                <Icon size={compact ? 16 : 20} />
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-bg-card">
                  <StatusOverlay status={status} />
                </span>
              </div>
              <div className="min-w-[70px]">
                <div className={cn("text-xs font-semibold", status === "pending" ? "text-white/35" : "text-white/90")}>
                  {STEP_LABELS[step]}
                </div>
                <div className="text-[10px] text-white/40">
                  {status === "running" ? "실행 중…" : event?.durationMs !== undefined ? formatDuration(event.durationMs) : status === "skipped" ? "미완료" : "–"}
                </div>
              </div>
            </button>

            {idx < STEP_ORDER.length - 1 && (
              <div
                className={cn(
                  "mt-6 h-0.5 flex-1 min-w-[16px] rounded-full transition-colors sm:min-w-[28px]",
                  connectorClasses(status, byStep.get(nextStep(idx))?.status ?? "pending")
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
