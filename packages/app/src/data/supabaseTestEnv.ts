export const SUPABASE_TEST_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
export const SUPABASE_TEST_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
export const SUPABASE_TEST_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const missing = [
  SUPABASE_TEST_URL ? null : "SUPABASE_URL or VITE_SUPABASE_URL",
  SUPABASE_TEST_ANON_KEY ? null : "SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY",
  SUPABASE_TEST_SERVICE_ROLE_KEY ? null : "SUPABASE_SERVICE_ROLE_KEY",
].filter((item): item is string => item !== null);

export const hasSupabaseTestStack = missing.length === 0;
export const supabaseTestSkipReason = hasSupabaseTestStack
  ? ""
  : `missing env vars: ${missing.join(", ")}`;

export function logSupabaseTestSkip(suite: string): void {
  if (hasSupabaseTestStack) return;
  console.warn(`[supabase-tests] skipping ${suite}: ${supabaseTestSkipReason}`);
}
