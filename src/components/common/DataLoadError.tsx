import { AlertTriangle } from "lucide-react";

/** Inline fallback shown when a Server Component's data fetch (Supabase or
 * otherwise) fails, so a misconfigured/broken backend degrades this one
 * panel instead of crashing the whole page. */
export function DataLoadError({ message }: { message?: string }) {
  return (
    <div className="glass-panel flex items-center gap-3 border-danger/30 bg-danger/[0.05] p-6 text-sm text-danger/90">
      <AlertTriangle size={18} className="shrink-0" />
      <span>
        {message ?? "데이터를 불러오지 못했습니다."} 잠시 후 다시 시도하거나, Settings에서 연결 상태를
        확인해주세요.
      </span>
    </div>
  );
}
