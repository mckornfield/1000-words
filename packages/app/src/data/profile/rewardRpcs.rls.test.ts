import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  hasSupabaseTestStack,
  logSupabaseTestSkip,
  SUPABASE_TEST_ANON_KEY,
  SUPABASE_TEST_SERVICE_ROLE_KEY,
  SUPABASE_TEST_URL,
  supabaseTestSkipReason,
} from "../supabaseTestEnv";

const PASSWORD = "reward-rpc-test-password-1!";
const suffix = Date.now();

function anonClient(): SupabaseClient {
  return createClient(SUPABASE_TEST_URL!, SUPABASE_TEST_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

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
  const signIn = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signIn.error) throw signIn.error;
  return { id: data.user.id, client };
}

logSupabaseTestSkip("retired raw reward RPC boundary");

describe.skipIf(!hasSupabaseTestStack)(
  hasSupabaseTestStack
    ? "retired raw reward RPC boundary"
    : `retired raw reward RPC boundary (${supabaseTestSkipReason})`,
  () => {
  let admin: SupabaseClient;
  let userA: { id: string; client: SupabaseClient };
  let userB: { id: string; client: SupabaseClient };

  beforeAll(async () => {
    admin = createClient(SUPABASE_TEST_URL!, SUPABASE_TEST_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    userA = await provisionUser(admin, `reward-a-${suffix}@test.local`);
    userB = await provisionUser(admin, `reward-b-${suffix}@test.local`);
  });

  afterAll(async () => {
    if (userA) await admin.auth.admin.deleteUser(userA.id);
    if (userB) await admin.auth.admin.deleteUser(userB.id);
  });

  it("denies every raw reward helper to authenticated callers", async () => {
    for (const [name, args] of [
      ["increment_xp", { delta: 25 }],
      ["add_tokens", { amount: 10 }],
      ["spend_tokens", { amount: 1 }],
    ] as const) {
      const result = await userA.client.rpc(name, args);
      expect(result.error, name).not.toBeNull();
    }
  });

  it("rejects the retired caller-selected uid signatures", async () => {
    for (const [name, args] of [
      ["increment_xp", { uid: userB.id, delta: 25 }],
      ["add_tokens", { uid: userB.id, amount: 10 }],
      ["spend_tokens", { uid: userB.id, amount: 1 }],
    ] as const) {
      const result = await userA.client.rpc(name, args);
      expect(result.error, name).not.toBeNull();
    }
  });

  it("denies direct protected profile updates while allowing display fields", async () => {
    const protectedWrite = await userA.client
      .from("profiles")
      .update({ xp: 1_000_000, tokens: 1_000_000, streak_count: 999 })
      .eq("user_id", userA.id);
    expect(protectedWrite.error).not.toBeNull();

    const displayWrite = await userA.client
      .from("profiles")
      .update({ display_name: "Secure learner", time_zone: "America/New_York" })
      .eq("user_id", userA.id)
      .select("display_name, time_zone")
      .single();
    expect(displayWrite.error).toBeNull();
    expect(displayWrite.data).toEqual({ display_name: "Secure learner", time_zone: "America/New_York" });
  });

  it("denies unauthenticated domain and raw reward execution", async () => {
    const client = anonClient();
    expect((await client.rpc("add_tokens", { amount: 1 })).error).not.toBeNull();
    expect((await client.rpc("purchase_item", { p_item_id: "Border-001", p_request_id: crypto.randomUUID() })).error).not.toBeNull();
  });
});
