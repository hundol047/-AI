"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import type { LogLevel, TraceEvent } from "@/lib/types";
import { eventsToLogLines } from "@/lib/traceDescribe";

const LEVEL_STYLES: Record<LogLevel, string> = {
  INFO: "text-cyan/80",
  WARN: "text-amber-400",
  ERROR: "text-danger",
};

export function TraceLogTable({ events }: { events: TraceEvent[] }) {
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<LogLevel | "ALL">("ALL");

  const lines = useMemo(() => eventsToLogLines(events), [events]);

  const filtered = lines.filter((l) => {
    if (levelFilter !== "ALL" && l.level !== levelFilter) return false;
    if (query && !l.message.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5">
          <Search size={14} className="text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="로그 메시지 검색…"
            className="w-full bg-transparent text-xs text-white/80 outline-none placeholder:text-white/30"
          />
        </div>
        <div className="flex gap-1">
          {(["ALL", "INFO", "WARN", "ERROR"] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
                levelFilter === lvl
                  ? "border-cyan/40 bg-cyan/10 text-cyan"
                  : "border-white/10 text-white/45 hover:border-white/25"
              )}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto font-mono text-xs">
        {filtered.length === 0 && <div className="p-6 text-center text-white/30">로그가 없습니다.</div>}
        {filtered.map((line, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-3 border-b border-white/5 px-4 py-2",
              line.level === "ERROR" && "bg-danger/[0.05]"
            )}
          >
            <span className="shrink-0 text-white/35">{formatTime(line.time)}</span>
            <span className={cn("w-12 shrink-0 font-semibold", LEVEL_STYLES[line.level])}>{line.level}</span>
            <span className="w-24 shrink-0 text-white/40">{line.step}</span>
            <span className={cn(line.level === "ERROR" ? "text-danger/90" : "text-white/70")}>{line.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
