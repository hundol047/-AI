import { NextResponse } from "next/server";
import { createRunSchema } from "@/lib/validation";
import { db } from "@/lib/db/store";
import { createRunStream, NDJSON_HEADERS } from "@/lib/agent/runExecutor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createRunSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  let run;
  try {
    run = await db.createRun(parsed.data);
  } catch (err) {
    console.error("[POST /api/runs] createRun failed:", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to create run: ${detail}` }, { status: 500 });
  }

  const stream = createRunStream(run);
  return new Response(stream, { headers: NDJSON_HEADERS });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? "100");
  try {
    const runs = await db.listRuns(Number.isFinite(limit) ? limit : 100);
    return NextResponse.json({ runs });
  } catch (err) {
    console.error("[GET /api/runs] listRuns failed:", err);
    return NextResponse.json({ error: "Failed to load runs." }, { status: 500 });
  }
}
