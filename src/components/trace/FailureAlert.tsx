import { AlertTriangle } from "lucide-react";

export function FailureAlert({ message }: { message?: string }) {
  return (
    <div className="glass-panel flex animate-slide-up items-center gap-3 border-danger/40 bg-danger/[0.07] p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-danger/40 bg-danger/15 text-danger">
        <AlertTriangle size={18} />
      </span>
      <div>
        <div className="text-sm font-semibold text-danger">⚠ Failure Detected</div>
        <div className="text-xs text-white/60">
          {message ?? "에이전트 실행 중 오류가 발생하여 작업이 중단되었습니다."}
        </div>
      </div>
    </div>
  );
}
