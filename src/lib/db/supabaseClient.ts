import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// NOTE: this module must only be imported from server-side code (API routes,
// route handlers, server components) since it reads the Supabase service
// role key. It is never bundled for the client because nothing under
// src/app/**/page.tsx (client components) imports it directly.

let cachedClient: SupabaseClient | null | undefined;

/**
 * Server-only Supabase client using the service role key.
 * Returns null when Supabase env vars are not configured, in which case
 * the application transparently falls back to the in-memory store
 * (see src/lib/db/store.ts).
 */
export function getSupabaseServerClient(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;

  const url = getSupabaseUrl()?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    cachedClient = null;
    return null;
  }

  // createClient() throws synchronously on a malformed URL. A bad value here
  // must never take the whole app down — fall back to the in-memory store
  // (see src/lib/db/store.ts) exactly as if Supabase were left unconfigured.
  try {
    cachedClient = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch (err) {
    console.error(
      "[supabase] Failed to initialize client (check NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL is a valid https:// URL); falling back to in-memory store:",
      err
    );
    cachedClient = null;
  }
  return cachedClient;
}

// Accepts either the Next.js-conventional NEXT_PUBLIC_SUPABASE_URL or the
// plain SUPABASE_URL some Supabase↔Vercel integrations provision automatically,
// so the app works with whichever one ends up set without the user having to
// fight a "variable already exists" error in the Vercel dashboard.
function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
}

// Reflects whether Supabase is actually usable (client constructed
// successfully), not just whether env vars are present, so this can never
// disagree with getSupabaseServerClient() and cause a null-client crash.
export function isSupabaseConfigured(): boolean {
  return getSupabaseServerClient() !== null;
}
