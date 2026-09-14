import { Lightbulb, CheckSquare } from "lucide-react";
import type { FailureAnalysis } from "@/lib/types";
import { FixReplayButton } from "@/components/trace/FixReplayButton";

export function RecommendedFixPanel({
  analysis,
  onFixReplay,
  replaying,
  disabled,
}: {
  analysis: FailureAnalysis;
  onFixReplay?: () => void;
  replaying?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="glass-panel animate-slide-up p-4">
      <div className="mb-3 flex items-center gap-2">
        <Lightbulb size={16} className="text-purple" />
        <h3 className="text-sm font-semibold text-white">Recommended Fix</h3>
      </div>

      <p className="mb-3 text-sm leading-relaxed text-white/85">{analysis.recommendedFix}</p>

      {analysis.fixSteps.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {analysis.fixSteps.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-white/60">
              <CheckSquare size={13} className="mt-0.5 shrink-0 text-purple/70" />
              {step}
            </li>
          ))}
        </ul>
      )}

      {analysis.patchSuggestion && (
        <pre className="code-block mb-4 whitespace-pre-wrap break-words">{analysis.patchSuggestion}</pre>
      )}

      {onFixReplay && <FixReplayButton onClick={onFixReplay} loading={replaying} disabled={disabled} />}
    </div>
  );
}
