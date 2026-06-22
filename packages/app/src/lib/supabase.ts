import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Shared Supabase browser client. Credentials come from Vite env vars
 * (see .env.example) and are safe to expose: the anon key is gated by
 * row-level security defined in supabase/migrations.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Surface misconfiguration early rather than failing on the first query.
  console.warn(
    "Supabase env vars missing. Copy .env.example to .env and fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.",
  );
}

// Use local Supabase default as fallback so createClient doesn't throw at
// module load time when env vars are absent (demo mode, no .env file).
export const supabase: SupabaseClient = createClient(
  url || "http://localhost:54321",
  anonKey || "demo-anon-key",
);
