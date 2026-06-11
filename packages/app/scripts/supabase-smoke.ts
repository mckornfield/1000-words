import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { initialState } from "@1000words/engine";
import { createProgressStore } from "../src/data/progressStore";

/**
 * End-to-end smoke check against a running local Supabase stack.
 *
 *   1. Sign up a throwaway user via the anon client.
 *   2. Upsert + read back card_progress through the production ProgressStore.
 *   3. Append a review_logs entry.
 *   4. Delete the user (and their rows, via on-delete-cascade).
 *
 * Exits non-zero on any failure. Reuses the repo-root `.env` via Node's
 * built-in env loader — no new deps.
 */

const rootEnv = fileURLToPath(new URL("../../../.env", import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error(
    "Missing env vars. Fill in the repo-root .env from .env.example and ensure `supabase start` is running.",
  );
  process.exit(1);
}

const email = `smoke-${Date.now()}@test.local`;
const password = "smoke-pw-1!";
const cardId = "es-0001";

const anon = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let userId: string | null = null;
try {
  console.log(`▶ signing up ${email}`);
  const { data, error } = await anon.auth.signUp({ email, password });
  if (error) throw error;
  if (!data.user || !data.session) {
    throw new Error("signUp returned no session (is email confirmation off?)");
  }
  userId = data.user.id;

  const store = createProgressStore(anon);
  const state = initialState(new Date());

  console.log(`▶ upserting progress for ${cardId}`);
  await store.upsertProgress(userId, cardId, state);

  console.log(`▶ reading progress back`);
  const got = await store.getProgress(userId, "en-es");
  if (!got[cardId]) throw new Error(`expected ${cardId} in progress, got ${JSON.stringify(got)}`);
  if (got[cardId]?.reps !== state.reps) {
    throw new Error(`reps mismatch: stored ${state.reps}, read ${got[cardId]?.reps}`);
  }

  console.log(`▶ logging review`);
  await store.logReview(userId, cardId, "good", 1234);

  console.log("\nsupabase smoke: OK");
} catch (err) {
  console.error("\nsupabase smoke: FAILED");
  console.error(err);
  process.exitCode = 1;
} finally {
  if (userId) {
    await admin.auth.admin.deleteUser(userId).catch((e) => {
      console.error("cleanup failed:", e);
    });
  }
}
