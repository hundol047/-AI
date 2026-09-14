"use client";

import { useCallback, useState } from "react";
import type { AgentRun, StreamEvent, TraceEvent } from "@/lib/types";

export interface UseRunStreamResult {
  run: AgentRun | null;
  events: TraceEvent[];
  isStreaming: boolean;
  error: string | null;
  start: (url: string, body?: unknown) => Promise<AgentRun | null>;
  reset: () => void;
}

/** Consumes an NDJSON execution stream from /api/runs or /api/runs/[id]/replay. */
export function useRunStream(): UseRunStreamResult {
  const [run, setRun] = useState<AgentRun | null>(null);
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setRun(null);
    setEvents([]);
    setError(null);
  }, []);

  const start = useCallback(async (url: string, body?: unknown) => {
    setIsStreaming(true);
    setError(null);
    setEvents([]);
    setRun(null);
    let finalRun: AgentRun | null = null;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(data.error ?? `요청에 실패했습니다 (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const evt = JSON.parse(line) as StreamEvent;

          switch (evt.kind) {
            case "run_created":
              setRun(evt.run);
              finalRun = evt.run;
              break;
            case "trace_event":
              setEvents((prev) => {
                const idx = prev.findIndex((e) => e.step === evt.event.step);
                if (idx >= 0) {
                  const copy = [...prev];
                  copy[idx] = evt.event;
                  return copy;
                }
                return [...prev, evt.event];
              });
              break;
            case "run_updated":
            case "done":
              setRun(evt.run);
              finalRun = evt.run;
              break;
            case "error":
              setError(evt.message);
              break;
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsStreaming(false);
    }

    return finalRun;
  }, []);

  return { run, events, isStreaming, error, start, reset };
}
