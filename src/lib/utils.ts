import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDuration(ms?: number): string {
  if (ms === undefined || ms === null) return "–";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatTime(iso?: string): string {
  if (!iso) return "–";
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", { hour12: false });
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "–";
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", { hour12: false });
}

export function formatPercent(n: number): string {
  return `${n}%`;
}

export function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}
