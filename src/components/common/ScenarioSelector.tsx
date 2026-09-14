"use client";

import { AlertTriangle, Clock, ShieldOff, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { SCENARIO_DESCRIPTIONS, SCENARIO_LABELS, type Scenario } from "@/lib/types";

const ICONS: Record<Scenario, typeof Sparkles> = {
  normal: Sparkles,
  auth_error: ShieldOff,
  outdated_source: AlertTriangle,
  tool_timeout: Clock,
};

const SCENARIOS: Scenario[] = ["normal", "auth_error", "outdated_source", "tool_timeout"];

export function ScenarioSelector({
  value,
  onChange,
  disabled,
}: {
  value: Scenario;
  onChange: (s: Scenario) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {SCENARIOS.map((scenario) => {
        const Icon = ICONS[scenario];
        const active = value === scenario;
        return (
          <button
            key={scenario}
            type="button"
            disabled={disabled}
            onClick={() => onChange(scenario)}
            className={cn(
              "group flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50",
              active
                ? "border-cyan/50 bg-cyan/[0.08] shadow-glow"
                : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]"
            )}
          >
            <Icon
              size={16}
              className={active ? "text-cyan" : "text-white/50 group-hover:text-white/70"}
            />
            <span className={cn("text-xs font-semibold", active ? "text-white" : "text-white/80")}>
              {SCENARIO_LABELS[scenario]}
            </span>
            <span className="text-[11px] leading-snug text-white/45">
              {SCENARIO_DESCRIPTIONS[scenario]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
