import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FailureAnalysis } from "@/lib/types";

const RISK_STYLES: Record<FailureAnalysis["riskLevel"], string> = {
  LOW: "border-success/40 bg-success/10 text-success",
  MEDIUM: "border-amber-400/40 bg-amber-400/10 text-amber-400",
  HIGH: "border-danger/40 bg-danger/10 text-danger",
};

export function RootCausePanel({ analysis, loading }: { analysis: FailureAnalysis | null; loading?: boolean }) {
  return (
    <div className="glass-panel animate-slide-up p-4">
      <div className="mb-3 flex items-center gap-2">
        <Search size={16} className="text-cyan" />
        <h3 className="text-sm font-semibold text-white">Root Cause Analysis</h3>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-4 text-sm text-white/50">
          <Loader2 size={16} className="animate-spin text-cyan" />
          실행 데이터를 분석하고 있습니다…
        </div>
      )}

      {!loading && analysis && (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-white/85">{analysis.rootCause}</p>
          <p className="text-xs leading-relaxed text-white/55">{analysis.explanation}</p>

          <div className={cn("inline-flex items-center gap-2 rounded-lg border px-3 py-2", RISK_STYLES[analysis.riskLevel])}>
            <span className="text-[11px] font-semibold uppercase tracking-wide">Risk</span>
            <span className="text-sm font-bold">{analysis.riskLevel}</span>
          </div>

          {analysis.source === "mock" && (
            <p className="text-[10px] text-white/30">
              * OPENAI_API_KEY가 설정되지 않아 규칙 기반 mock 분석 결과를 표시하고 있습니다.
            </p>
          )}
        </div>
      )}

      {!loading && !analysis && (
        <p className="text-sm text-white/40">분석할 실패 데이터가 없습니다.</p>
      )}
    </div>
  );
}
