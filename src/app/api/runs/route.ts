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

  const run = await db.createRun(parsed.data);
  const stream = createRunStream(run);

  return new Response(stream, { headers: NDJSON_HEADERS });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? "100");
  const runs = await db.listRuns(Number.isFinite(limit) ? limit : 100);
  return NextResponse.json({ runs });
}
