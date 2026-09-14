"use client";

import { Loader2, Play } from "lucide-react";

export function FixReplayButton({
  onClick,
  loading,
  disabled,
}: {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled || loading} className="btn-primary w-full">
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
      {loading ? "재실행 중…" : "Fix & Replay"}
    </button>
  );
}
