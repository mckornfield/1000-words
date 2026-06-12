import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { initialState } from "@1000words/engine";
import { createProgressStore } from "./progressStore";

/**
 * Live integration test against a local Supabase stack. Verifies that row-level
 * security blocks one user from reading or writing another user's progress and
 * review logs. Skipped automatically when the env vars are absent so unit-test
 * runs (and CI without Docker) stay green.
 *
 * Setup: `supabase start`, then fill in the root `.env` (see .env.example).
 * Vitest's setup file loads it into process.env automatically.
 */

const URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasStack = Boolean(URL && ANON && SERVICE);

function anonClient(): SupabaseClient {
  return createClient(URL!, ANON!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const PASSWORD = "rls-test-password-1!";
const suffix = Date.now();

describe.skipIf(!hasStack)("ProgressStore RLS isolation", () => {
  let admin: SupabaseClient;
  let userA: { id: string; client: SupabaseClient };
  let userB: { id: string; client: SupabaseClient };

  beforeAll(async () => {
    admin = createClient(URL!, SERVICE!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    userA = await provisionUser(admin, `rls-a-${suffix}@test.local`);
    userB = await provisionUser(admin, `rls-b-${suffix}@test.local`);
  });

  afterAll(async () => {
    if (userA) await admin.auth.admin.deleteUser(userA.id);
    if (userB) await admin.auth.admin.deleteUser(userB.id);
  });

  it("user B cannot read user A's card_progress", async () => {
    const cardId = "es-0001";
    const storeA = createProgressStore(userA.client);
    await storeA.upsertProgress(userA.id, cardId, initialState(new Date()));

    const storeB = createProgressStore(userB.client);
    const seen = await storeB.getProgress(userA.id, "en-es");
    expect(seen).toEqual({});
  });

  it("user B cannot overwrite user A's card_progress", async () => {
    const cardId = "es-0002";
    const storeA = createProgressStore(userA.client);
    const original = initialState(new Date("2026-06-01T00:00:00Z"));
    await storeA.upsertProgress(userA.id, cardId, original);

    const storeB = createProgressStore(userB.client);
    // The upsert succeeds for B's own row but never touches A's; A's row stays.
    await storeB
      .upsertProgress(userA.id, cardId, { ...original, reps: 999 })
      .catch(() => undefined);

    const stillA = await storeA.getProgress(userA.id, "en-es");
    expect(stillA[cardId]?.reps).toBe(original.reps);
  });

  it("user B cannot read user A's review_logs", async () => {
    const storeA = createProgressStore(userA.client);
    await storeA.logReview(userA.id, "es-0003", "good", 1500);

    const { data, error } = await userB.client
      .from("review_logs")
      .select("id")
      .eq("user_id", userA.id);
    expect(error).toBeNull();
    expect(data ?? []).toEqual([]);
  });

  it("user A can read back their own progress after upserting", async () => {
    const cardId = "es-0004";
    const storeA = createProgressStore(userA.client);
    const state = initialState(new Date("2026-06-02T00:00:00Z"));
    await storeA.upsertProgress(userA.id, cardId, state);
    const got = await storeA.getProgress(userA.id, "en-es");
    expect(got[cardId]).toBeDefined();
    expect(got[cardId]?.reps).toBe(state.reps);
  });
});

async function provisionUser(
  admin: SupabaseClient,
  email: string,
): Promise<{ id: string; client: SupabaseClient }> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error(`createUser failed for ${email}`);
  const client = anonClient();
  const sign = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (sign.error) throw sign.error;
  return { id: data.user.id, client };
}
