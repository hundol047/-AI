import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db/supabaseClient";
import { isTavilyConfigured } from "@/lib/tools/tavily";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    supabaseConfigured: isSupabaseConfigured(),
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    tavilyConfigured: isTavilyConfigured(),
    storageMode: isSupabaseConfigured() ? "supabase" : "memory",
    agentMode: isTavilyConfigured() ? "real" : "simulated",
  });
}
