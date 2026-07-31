import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { StudyCompletionResultSchema } from "../src/data/rpcSchemas";

/**
 * End-to-end smoke against a reset local Supabase stack. It proves the four
 * browser-facing domain commands work and that their retired table/reward write
 * paths remain unavailable to an authenticated client.
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
const anon = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const reviewNow = Date.now();
const nextState = {
  due: new Date(reviewNow + 24 * 60 * 60 * 1000).toISOString(),
  stability: 1,
  difficulty: 5,
  elapsedDays: 0,
  scheduledDays: 1,
  learningSteps: 0,
  reps: 1,
  lapses: 0,
  state: 2,
  lastReview: new Date(reviewNow).toISOString(),
};

let userId: string | null = null;
try {
  console.log(`▶ signing up ${email}`);
  const { data, error } = await anon.auth.signUp({ email, password });
  if (error) throw error;
  if (!data.user || !data.session) {
    throw new Error("signUp returned no session (is email confirmation off?)");
  }
  userId = data.user.id;

  const seeded = await admin.from("profiles").update({ tokens: 500 }).eq("user_id", userId);
  if (seeded.error) throw seeded.error;

  console.log("▶ proving retired direct writes and raw reward helpers are denied");
  await expectDenied("direct card_progress insert", anon.from("card_progress").insert({
    user_id: userId,
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
  }));
  await expectDenied("direct review_logs insert", anon.from("review_logs").insert({
    user_id: userId,
    card_id: "es-0999",
    rating: 4,
    elapsed_ms: 1,
  }));
  await expectDenied(
    "direct reward balance update",
    anon.from("profiles").update({ xp: 999_999, tokens: 999_999 }).eq("user_id", userId),
  );
  await expectDenied("increment_xp", anon.rpc("increment_xp", { delta: 10 }));
  await expectDenied("add_tokens", anon.rpc("add_tokens", { amount: 10 }));
  await expectDenied("spend_tokens", anon.rpc("spend_tokens", { amount: 1 }));

  const sessionId = crypto.randomUUID();
  console.log("▶ recording card review through record_card_review");
  const recorded = await anon.rpc("record_card_review", {
    p_review_id: crypto.randomUUID(),
    p_session_id: sessionId,
    p_lang_pair: "en-es",
    p_card_id: "es-0001",
    p_rating: 4,
    p_elapsed_ms: 15_000,
    p_next_state: nextState,
  });
  if (recorded.error) throw recorded.error;
  if (recorded.data.cardId !== "es-0001" || recorded.data.replayed !== false) {
    throw new Error(`unexpected review result: ${JSON.stringify(recorded.data)}`);
  }

  console.log("▶ completing study through complete_study_session");
  const completedAt = new Date();
  const completion = await anon.rpc("complete_study_session", {
    p_session_id: sessionId,
    p_lang_pair: "en-es",
    p_started_at: new Date(completedAt.getTime() - 60_000).toISOString(),
    p_completed_at: completedAt.toISOString(),
  });
  if (completion.error) throw completion.error;
  const parsedCompletion = StudyCompletionResultSchema.parse(completion.data);
  if (parsedCompletion.cardsReviewed !== 1 || parsedCompletion.reviewXp !== 15) {
    throw new Error(`unexpected completion result: ${JSON.stringify(parsedCompletion)}`);
  }

  console.log("▶ purchasing through purchase_item and equipping through equip_item");
  const purchase = await anon.rpc("purchase_item", {
    p_item_id: "Border-001",
    p_request_id: crypto.randomUUID(),
  });
  if (purchase.error) throw purchase.error;
  if (purchase.data.tokenCost !== 90 || purchase.data.balance !== 410) {
    throw new Error(`unexpected purchase result: ${JSON.stringify(purchase.data)}`);
  }
  const equipRequestId = crypto.randomUUID();
  const equipped = await anon.rpc("equip_item", { p_item_id: "Border-001", p_request_id: equipRequestId });
  if (equipped.error) throw equipped.error;
  if (equipped.data.requestId !== equipRequestId || equipped.data.itemId !== "Border-001" || equipped.data.equipped?.itemId !== "Border-001") {
    throw new Error(`unexpected equip result: ${JSON.stringify(equipped.data)}`);
  }

  const progress = await anon.from("card_progress").select("card_id, reps").eq("card_id", "es-0001").single();
  if (progress.error || progress.data.reps !== 1) {
    throw progress.error ?? new Error(`progress mismatch: ${JSON.stringify(progress.data)}`);
  }
  const profile = await anon.from("profiles").select("xp, tokens").eq("user_id", userId).single();
  if (profile.error || profile.data.xp !== parsedCompletion.totalXpAwarded || profile.data.tokens !== 410) {
    throw profile.error ?? new Error(`profile mismatch: ${JSON.stringify(profile.data)}`);
  }

  console.log("\nsupabase smoke: OK");
} catch (err) {
  console.error("\nsupabase smoke: FAILED");
  console.error(err);
  process.exitCode = 1;
} finally {
  if (userId) {
    const { error: cleanupError } = await admin.auth.admin.deleteUser(userId);
    if (cleanupError) {
      console.error("cleanup failed:", cleanupError);
      process.exitCode = 1;
    }
  }
}

async function expectDenied(
  label: string,
  operation: PromiseLike<{ error: unknown }>,
): Promise<void> {
  const result = await operation;
  if (!result.error) throw new Error(`${label} unexpectedly succeeded`);
}
