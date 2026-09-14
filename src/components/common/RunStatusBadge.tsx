import { CheckCircle2, CircleDashed, Loader2, XCircle, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RunStatus, StepStatus } from "@/lib/types";

type Status = RunStatus | StepStatus;

const CONFIG: Record<Status, { label: string; classes: string; Icon: typeof CheckCircle2 }> = {
  pending: { label: "Pending", classes: "border-white/15 bg-white/5 text-white/50", Icon: CircleDashed },
  running: { label: "Running", classes: "border-cyan/40 bg-cyan/10 text-cyan animate-pulse", Icon: Loader2 },
  completed: { label: "Completed", classes: "border-success/40 bg-success/10 text-success", Icon: CheckCircle2 },
  failed: { label: "Failed", classes: "border-danger/40 bg-danger/10 text-danger", Icon: XCircle },
  skipped: { label: "Skipped", classes: "border-white/15 bg-white/5 text-white/40", Icon: MinusCircle },
};

export function RunStatusBadge({ status, className }: { status: Status; className?: string }) {
  const cfg = CONFIG[status];
  const label = status === "failed" && cfg === CONFIG.failed ? "Completed with errors" : cfg.label;
  return (
    <span className={cn("badge", cfg.classes, className)}>
      <cfg.Icon size={13} className={status === "running" ? "animate-spin" : ""} />
      {status === "failed" ? "Failed" : label}
    </span>
  );
}

export function RunStatusPill({ status }: { status: RunStatus }) {
  if (status === "completed") {
    return <span className="badge border-success/40 bg-success/10 text-success">Completed</span>;
  }
  if (status === "failed") {
    return <span className="badge border-danger/40 bg-danger/10 text-danger">Completed with errors</span>;
  }
  return (
    <span className="badge border-cyan/40 bg-cyan/10 text-cyan">
      <Loader2 size={13} className="animate-spin" /> Running
    </span>
  );
}
