import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { StudyCompletionResultSchema } from "./rpcSchemas";

/**
 * Live integration coverage for the retired table-write boundary and the four
 * authenticated domain commands that replace it. The suite is conditional for
 * ordinary unit runs; CI supplies a reset local stack and rejects every skip.
 */
const URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasStack = Boolean(URL && ANON && SERVICE);
const PASSWORD = "rls-test-password-1!";
const suffix = Date.now();

const nextState = {
  due: "2026-07-27T00:00:00.000Z",
  stability: 1,
  difficulty: 5,
  elapsedDays: 0,
  scheduledDays: 1,
  learningSteps: 0,
  reps: 1,
  lapses: 0,
  state: 2,
  lastReview: "2026-07-26T12:00:00.000Z",
};

function anonClient(): SupabaseClient {
  return createClient(URL!, ANON!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

describe.skipIf(!hasStack)("secure progress and economy domain boundary", () => {
  let admin: SupabaseClient;
  let userA: { id: string; client: SupabaseClient };
  let userB: { id: string; client: SupabaseClient };

  beforeAll(async () => {
    admin = createClient(URL!, SERVICE!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    userA = await provisionUser(admin, `rls-a-${suffix}@test.local`);
    userB = await provisionUser(admin, `rls-b-${suffix}@test.local`);
    const seed = await admin.from("profiles").update({ tokens: 500 }).eq("user_id", userA.id);
    if (seed.error) throw seed.error;
  });

  afterAll(async () => {
    if (userA) await admin.auth.admin.deleteUser(userA.id);
    if (userB) await admin.auth.admin.deleteUser(userB.id);
  });

  it("rejects retired direct progress, review-log, and raw reward writes", async () => {
    const directProgress = await userA.client.from("card_progress").insert({
      user_id: userA.id,
      card_id: "es-0999",
      lang_pair: "en-es",
      due: nextState.due,
      stability: 1,
      difficulty: 5,
      elapsed_days: 0,
      scheduled_days: 1,
      learning_steps: 0,
      reps: 999,
      lapses: 0,
      state: 2,
      last_review: nextState.lastReview,
    });
    expect(directProgress.error).not.toBeNull();

    const directLog = await userA.client.from("review_logs").insert({
      user_id: userA.id,
      card_id: "es-0999",
      rating: 4,
      elapsed_ms: 1,
    });
    expect(directLog.error).not.toBeNull();

    const directReward = await userA.client
      .from("profiles")
      .update({ xp: 999_999, tokens: 999_999 })
      .eq("user_id", userA.id);
    expect(directReward.error).not.toBeNull();

    for (const [name, args] of [
      ["increment_xp", { delta: 1_000_000 }],
      ["add_tokens", { amount: 1_000_000 }],
      ["spend_tokens", { amount: 1 }],
    ] as const) {
      expect((await userA.client.rpc(name, args)).error, name).not.toBeNull();
    }
  });

  it("records progress and its review log only through record_card_review with RLS isolation", async () => {
    const reviewId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const recorded = await userA.client.rpc("record_card_review", {
      p_review_id: reviewId,
      p_session_id: sessionId,
      p_lang_pair: "en-es",
      p_card_id: "es-0001",
      p_rating: 4,
      p_elapsed_ms: 15_000,
      p_next_state: nextState,
    });
    expect(recorded.error).toBeNull();
    expect(recorded.data).toMatchObject({ reviewId, sessionId, cardId: "es-0001", replayed: false });

    const ownProgress = await userA.client
      .from("card_progress")
      .select("card_id, reps")
      .eq("card_id", "es-0001")
      .single();
    expect(ownProgress.error).toBeNull();
    expect(ownProgress.data).toEqual({ card_id: "es-0001", reps: 1 });

    const retiredUpdate = await userA.client
      .from("card_progress")
      .update({ reps: 999 })
      .eq("card_id", "es-0001");
    expect(retiredUpdate.error).not.toBeNull();

    const otherProgress = await userB.client
      .from("card_progress")
      .select("card_id")
      .eq("user_id", userA.id);
    expect(otherProgress.error).toBeNull();
    expect(otherProgress.data).toEqual([]);

    const otherLogs = await userB.client
      .from("review_logs")
      .select("review_id")
      .eq("user_id", userA.id);
    expect(otherLogs.error).toBeNull();
    expect(otherLogs.data).toEqual([]);
  });

  it("awards server-owned study rewards only through complete_study_session", async () => {
    const sessionId = crypto.randomUUID();
    const review = await userA.client.rpc("record_card_review", {
      p_review_id: crypto.randomUUID(),
      p_session_id: sessionId,
      p_lang_pair: "en-es",
      p_card_id: "es-0002",
      p_rating: 3,
      p_elapsed_ms: 12_000,
      p_next_state: nextState,
    });
    expect(review.error).toBeNull();

    const completedAt = new Date();
    const completion = await userA.client.rpc("complete_study_session", {
      p_session_id: sessionId,
      p_lang_pair: "en-es",
      p_started_at: new Date(completedAt.getTime() - 60_000).toISOString(),
      p_completed_at: completedAt.toISOString(),
    });
    expect(completion.error).toBeNull();
    expect(() => StudyCompletionResultSchema.parse(completion.data)).not.toThrow();
    expect(completion.data).toMatchObject({ sessionId, cardsReviewed: 1, reviewXp: 10, replayed: false });
  });

  it("purchases and equips only through trusted purchase_item and equip_item commands", async () => {
    const purchase = await userA.client.rpc("purchase_item", {
      p_item_id: "Border-001",
      p_request_id: crypto.randomUUID(),
    });
    expect(purchase.error).toBeNull();
    expect(purchase.data).toMatchObject({ itemId: "Border-001", tokenCost: 90, balance: 410, status: "purchased" });

    const equipped = await userA.client.rpc("equip_item", {
      p_item_id: "Border-001",
      p_request_id: crypto.randomUUID(),
    });
    expect(equipped.error).toBeNull();
    expect(equipped.data.equipped).toEqual({ slot: "profile_border", itemId: "Border-001" });
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
