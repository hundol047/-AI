import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function AnalyticsCard({
  label,
  value,
  icon: Icon,
  accent = "cyan",
  sublabel,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: "cyan" | "success" | "danger" | "purple";
  sublabel?: string;
}) {
  const accentClasses: Record<string, string> = {
    cyan: "text-cyan border-cyan/30 bg-cyan/10",
    success: "text-success border-success/30 bg-success/10",
    danger: "text-danger border-danger/30 bg-danger/10",
    purple: "text-purple border-purple/30 bg-purple/10",
  };

  return (
    <div className="glass-card flex items-center gap-4 p-4">
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border", accentClasses[accent])}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-white/45">{label}</div>
        <div className="truncate text-xl font-bold text-white">{value}</div>
        {sublabel && <div className="text-[11px] text-white/35">{sublabel}</div>}
      </div>
    </div>
  );
}
