"use client";

import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Database, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsStatus {
  supabaseConfigured: boolean;
  openaiConfigured: boolean;
  storageMode: "supabase" | "memory";
}

export default function SettingsPage() {
  const [status, setStatus] = useState<SettingsStatus | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan/30 bg-cyan/10 text-cyan">
          <SettingsIcon size={20} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="text-sm text-white/45">TraceAgent의 연결 상태와 기본 설정을 확인하세요.</p>
        </div>
      </div>

      <div className="glass-panel p-5">
        <h2 className="mb-4 text-sm font-semibold text-white">연결 상태</h2>
        <div className="space-y-3">
          <StatusRow
            icon={Database}
            label="Supabase"
            description={
              status?.storageMode === "supabase"
                ? "Supabase 프로젝트에 실행 데이터가 저장됩니다."
                : "환경변수가 설정되지 않아 in-memory 저장소를 사용 중입니다 (개발용 fallback)."
            }
            ok={Boolean(status?.supabaseConfigured)}
          />
          <StatusRow
            icon={Sparkles}
            label="OpenAI API"
            description={
              status?.openaiConfigured
                ? "OpenAI를 통해 Root Cause Analysis가 생성됩니다."
                : "OPENAI_API_KEY가 없어 규칙 기반 mock 분석기를 사용 중입니다."
            }
            ok={Boolean(status?.openaiConfigured)}
          />
        </div>
      </div>

      <div className="glass-panel p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">환경변수</h2>
        <p className="mb-3 text-xs text-white/45">
          프로젝트 루트의 <code className="rounded bg-white/10 px-1 py-0.5">.env.local</code> 파일에 아래 값을
          설정하세요. API Key는 서버에서만 사용되며 클라이언트에 노출되지 않습니다.
        </p>
        <pre className="code-block whitespace-pre-wrap">
{`OPENAI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=`}
        </pre>
      </div>

      <div className="glass-panel p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">About</h2>
        <p className="text-xs leading-relaxed text-white/45">
          TraceAgent는 AI 에이전트의 실행 과정(Tool Call, 검색, API 호출, 오류, 상태 변화)을 기록하고, 실패
          지점을 AI가 분석하여 원인과 개선안을 제시한 뒤 수정 후 재실행 결과까지 비교·검증할 수 있는 Agent
          Observability & Debugging Platform입니다.
        </p>
      </div>
    </div>
  );
}

function StatusRow({
  icon: Icon,
  label,
  description,
  ok,
}: {
  icon: typeof Database;
  label: string;
  description: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <Icon size={16} className="mt-0.5 shrink-0 text-white/50" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-white/85">{label}</div>
        <div className="text-xs text-white/45">{description}</div>
      </div>
      <span
        className={cn(
          "flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
          ok ? "border-success/40 bg-success/10 text-success" : "border-amber-400/40 bg-amber-400/10 text-amber-400"
        )}
      >
        {ok ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
        {ok ? "Connected" : "Fallback"}
      </span>
    </div>
  );
}
