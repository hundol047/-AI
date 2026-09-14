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

  const url = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    cachedClient = null;
    return null;
  }

  cachedClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

// Accepts either the Next.js-conventional NEXT_PUBLIC_SUPABASE_URL or the
// plain SUPABASE_URL some Supabase↔Vercel integrations provision automatically,
// so the app works with whichever one ends up set without the user having to
// fight a "variable already exists" error in the Vercel dashboard.
function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
