import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { StudyCompletionResultSchema } from "./rpcSchemas";
import {
  hasSupabaseTestStack,
  logSupabaseTestSkip,
  SUPABASE_TEST_ANON_KEY,
  SUPABASE_TEST_SERVICE_ROLE_KEY,
  SUPABASE_TEST_URL,
  supabaseTestSkipReason,
} from "./supabaseTestEnv";

const migrationDirectory = resolve(process.cwd(), "../../supabase/migrations");
const correctivePath = resolve(migrationDirectory, "20260726020000_correct_secure_domain_boundary.sql");
const equipPath = resolve(migrationDirectory, "20260726030000_durable_equip_requests.sql");
const correctiveSql = readFileSync(correctivePath, "utf8");
const equipSql = readFileSync(equipPath, "utf8");
const sql = readdirSync(migrationDirectory)
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => readFileSync(resolve(migrationDirectory, name), "utf8"))
  .join("\n");

function functionBody(name: string): string {
  const matches = [...sql.matchAll(new RegExp(`create(?: or replace)? function public\\.${name}\\b[\\s\\S]*?\\$function\\$;`, "gi"))];
  const match = matches.at(-1);
  expect(match, `${name} must exist`).toBeDefined();
  return match![0];
}

describe("secure Supabase domain boundary migration", () => {
  it.each(["record_card_review", "complete_study_session", "purchase_item", "equip_item", "get_leaderboard", "get_current_user_rank"])(
    "%s is a hardened SECURITY DEFINER command",
    (name) => {
      const body = functionBody(name);
      expect(body).toMatch(/security definer/i);
      expect(body).toMatch(/set search_path\s*=\s*''/i);
      expect(body).toMatch(/auth\.uid\(\)/i);
    },
  );

  it("restores own-row profile updates while retaining column grants and strict profile validation", () => {
    expect(correctiveSql).toMatch(/create policy profiles_update_own[\s\S]*?for update[\s\S]*?using \(auth\.uid\(\) = user_id\)[\s\S]*?with check \(auth\.uid\(\) = user_id\)/i);
    expect(correctiveSql).toMatch(/revoke update on table public\.profiles from authenticated/i);
    expect(correctiveSql).toMatch(/grant update \(display_name, bio, settings, time_zone\) on table public\.profiles to authenticated/i);
    const validator = functionBody("validate_profile_secure_fields");
    expect(validator).toMatch(/pg_catalog\.pg_timezone_names/i);
    expect(validator).toMatch(/dailyGoalMinutes/);
    expect(validator).toMatch(/settings\s*-\s*array/i);
    expect(validator).toMatch(/invalid_display_name/i);
    expect(validator).toMatch(/invalid_bio/i);
    expect(validator).toMatch(/set search_path\s*=\s*''/i);
  });

  it("binds review evidence to shipped due cards and bounded locked sessions", () => {
    expect(sql).toMatch(/review_logs_user_session_card_key/i);
    const review = functionBody("record_card_review");
    expect(review).toMatch(/review-id:/i);
    expect(review).toMatch(/session:/i);
    expect(review).toMatch(/between 1 and 1000/i);
    expect(review).toMatch(/p_elapsed_ms < 250/i);
    expect(review).toMatch(/count\(\*\).*>= 20/is);
    expect(review).toMatch(/from public\.card_progress[\s\S]*?for update/i);
    expect(review).toMatch(/not_due/i);
    expect(review).toMatch(/next_state_due_not_future/i);
    expect(review).toMatch(/next_state_reps_mismatch/i);
    expect(review).toMatch(/next_state_last_review_mismatch/i);
    expect(review).toMatch(/reward_eligible/i);
    const completion = functionBody("complete_study_session");
    expect(completion).toMatch(/bool_and\(reward_eligible\b/i);
    expect(completion).toMatch(/count\(distinct card_id\)/i);
    expect(completion).toMatch(/invalid_reward_evidence/i);
    expect(completion.indexOf("select * into v_prior")).toBeLessThan(completion.indexOf("interval '5 minutes'"));
  });

  it("removes browser access to minting helpers and protected row writes", () => {
    expect(sql).toMatch(/revoke all on function public\.increment_xp\(integer\) from public, anon, authenticated/i);
    expect(sql).toMatch(/revoke all on function public\.add_tokens\(integer\) from public, anon, authenticated/i);
    expect(sql).toMatch(/revoke all on function public\.spend_tokens\(integer\) from public, anon, authenticated/i);
    for (const table of ["review_logs", "user_achievements", "user_inventory", "user_equipped"] as const) {
      expect(sql).toMatch(new RegExp(`revoke (?:insert, update, delete|all) on table public\\.${table} from authenticated`, "i"));
    }
  });

  it("uses trusted catalogs, stable request IDs, profile timezones, and pre-aggregated leaderboard inputs", () => {
    expect(sql).toMatch(/create table (?:if not exists )?public\.achievement_catalog/i);
    expect(sql).toMatch(/create table (?:if not exists )?public\.store_catalog/i);
    expect(sql).toMatch(/create table (?:if not exists )?public\.purchase_requests/i);
    expect(sql).toMatch(/create table (?:if not exists )?public\.equip_requests/i);
    expect(sql).toMatch(/create table (?:if not exists )?public\.study_sessions/i);
    expect(sql).toMatch(/create table (?:if not exists )?public\.user_learning_totals/i);
    expect(functionBody("complete_study_session")).toMatch(/pg_timezone_names/i);
    expect(functionBody("purchase_item")).toMatch(/from public\.store_catalog/i);
    const leaderboard = functionBody("get_leaderboard");
    expect(leaderboard).toMatch(/achievement_counts as/i);
    expect(leaderboard).toMatch(/equipped_items as/i);
    expect(leaderboard).toMatch(/row_number\(\) over/i);
    expect(functionBody("get_current_user_rank")).not.toMatch(/\(uid uuid\)/i);
  });

  it("durably replays equip results and keeps the obsolete one-argument RPC revoked", () => {
    const equip = functionBody("equip_item");
    expect(equip).toMatch(/p_request_id uuid/i);
    expect(equip).toMatch(/from public\.equip_requests[\s\S]*?for update/i);
    expect(equip).toMatch(/idempotency_conflict/i);
    expect(equip).toMatch(/from public\.store_catalog/i);
    expect(equip).toMatch(/from public\.user_inventory/i);
    expect(equip).toMatch(/jsonb_set\(v_prior\.result, '\{replayed\}'/i);
    expect(equipSql).toMatch(/revoke all on function public\.equip_item\(text\) from public, anon, authenticated/i);
    expect(equipSql).toMatch(/revoke all on function public\.equip_item\(text, uuid\) from public, anon, authenticated/i);
    expect(equipSql).toMatch(/grant execute on function public\.equip_item\(text, uuid\) to authenticated/i);
  });

  it("bounds auto-provisioned display names before profile validation", () => {
    const provision = functionBody("handle_new_user");
    expect(provision).toMatch(/raw_user_meta_data/i);
    expect(provision).toMatch(/char_length[\s\S]*?120/i);
    expect(provision).toMatch(/substring/i);
  });

  it("seeds every current demo achievement and store item ID", () => {
    for (let n = 1; n <= 12; n += 1) expect(sql).toContain(`Ach-${String(n).padStart(3, "0")}`);
    for (const id of [
      "StoreAvatar-001", "StoreAvatar-002", "StoreAvatar-003",
      "Border-001", "Border-002", "Border-003", "Border-004",
      "Accent-001", "Accent-002", "Accent-003",
    ]) expect(sql).toContain(id);
  });
});

const PASSWORD = "secure-boundary-test-password-1!";
const suffix = Date.now();

function anonClient(): SupabaseClient {
  return createClient(SUPABASE_TEST_URL!, SUPABASE_TEST_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function provisionUser(admin: SupabaseClient, email: string) {
  const created = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (created.error || !created.data.user) throw created.error ?? new Error("createUser failed");
  const client = anonClient();
  const signIn = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signIn.error) throw signIn.error;
  return { id: created.data.user.id, client };
}

const state = {
  due: new Date(Date.now() + 24 * 60 * 60 * 1_000).toISOString(), stability: 1, difficulty: 5,
  elapsedDays: 0, scheduledDays: 1, learningSteps: 0, reps: 1,
  lapses: 0, state: 2, lastReview: new Date().toISOString(),
};

logSupabaseTestSkip("secure domain commands against local Supabase");

describe.skipIf(!hasSupabaseTestStack)(
  hasSupabaseTestStack
    ? "secure domain commands against local Supabase"
    : `secure domain commands against local Supabase (${supabaseTestSkipReason})`,
  () => {
  let admin: SupabaseClient;
  let a: Awaited<ReturnType<typeof provisionUser>>;
  let b: Awaited<ReturnType<typeof provisionUser>>;

  beforeAll(async () => {
    admin = createClient(SUPABASE_TEST_URL!, SUPABASE_TEST_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
    a = await provisionUser(admin, `secure-a-${suffix}@test.local`);
    b = await provisionUser(admin, `secure-b-${suffix}@test.local`);
    const seeded = await admin.from("profiles").update({ tokens: 500, time_zone: "America/Los_Angeles" }).eq("user_id", a.id);
    if (seeded.error) throw seeded.error;
  });

  afterAll(async () => {
    if (a) await admin.auth.admin.deleteUser(a.id);
    if (b) await admin.auth.admin.deleteUser(b.id);
  });

  it("blocks direct protected writes, cross-user writes, and raw self-minting", async () => {
    expect((await a.client.from("profiles").update({ xp: 999_999 }).eq("user_id", a.id)).error).not.toBeNull();
    const crossUserWrite = await a.client.from("profiles").update({ display_name: "forged" }).eq("user_id", b.id);
    expect(crossUserWrite.error).toBeNull();
    const bProfile = await admin.from("profiles").select("display_name").eq("user_id", b.id).single();
    expect(bProfile.data?.display_name).not.toBe("forged");
    expect((await a.client.from("user_achievements").insert({ user_id: a.id, achievement_id: "Ach-012" })).error).not.toBeNull();
    expect((await a.client.from("user_inventory").insert({ user_id: a.id, item_id: "Border-004" })).error).not.toBeNull();
    expect((await a.client.from("user_equipped").insert({ user_id: a.id, slot: "profile_border", item_id: "Border-004" })).error).not.toBeNull();
    expect((await a.client.from("review_logs").insert({ user_id: a.id, card_id: "forged", rating: 4 })).error).not.toBeNull();
    expect((await a.client.rpc("increment_xp", { delta: 1_000_000 })).error).not.toBeNull();
    expect((await a.client.rpc("add_tokens", { amount: 1_000_000 })).error).not.toBeNull();
  });

  it("allows bounded own-row profile edits and rejects malformed profile fields", async () => {
    const validSettings = {
      themePreference: "dark", dailyGoalMinutes: 20, autoAdvance: true,
      notifications: { streak: true, goalComplete: false, xpMilestone: true },
    };
    const valid = await a.client.from("profiles").update({
      display_name: "Secure learner", bio: "Learning safely", settings: validSettings,
      time_zone: "America/New_York",
    }).eq("user_id", a.id).select("display_name, bio, settings, time_zone").single();
    expect(valid.error).toBeNull();
    expect(valid.data?.settings).toEqual(validSettings);

    for (const patch of [
      { display_name: "x".repeat(121) },
      { bio: "bad\u0000bio" },
      { settings: { ...validSettings, dailyGoalMinutes: 17 } },
      { settings: { ...validSettings, forged: true } },
      { time_zone: "CST" },
      { time_zone: "Not/A_Real_Zone" },
    ]) {
      expect((await a.client.from("profiles").update(patch).eq("user_id", a.id)).error, JSON.stringify(patch)).not.toBeNull();
    }
  });

  it("rejects nonexistent, duplicate, not-due, and unbounded review evidence", async () => {
    const base = {
      p_session_id: crypto.randomUUID(), p_lang_pair: "en-es", p_rating: 4,
      p_elapsed_ms: 1_000, p_next_state: state,
    };
    for (const p_card_id of ["es-0000", "es-1001", "zh-0001", "es-9999", "es-001"]) {
      const result = await a.client.rpc("record_card_review", { ...base, p_review_id: crypto.randomUUID(), p_card_id });
      expect(result.error, p_card_id).not.toBeNull();
    }
    expect((await a.client.rpc("record_card_review", {
      ...base, p_review_id: crypto.randomUUID(), p_card_id: "es-0010", p_elapsed_ms: 0,
    })).error).not.toBeNull();

    const firstId = crypto.randomUUID();
    const first = await a.client.rpc("record_card_review", { ...base, p_review_id: firstId, p_card_id: "es-0010" });
    expect(first.error).toBeNull();
    expect((await a.client.rpc("record_card_review", {
      ...base, p_review_id: crypto.randomUUID(), p_card_id: "es-0010",
    })).error).not.toBeNull();
    expect((await a.client.rpc("record_card_review", {
      ...base, p_session_id: crypto.randomUUID(), p_review_id: crypto.randomUUID(), p_card_id: "es-0010",
    })).error).not.toBeNull();
    expect((await a.client.rpc("record_card_review", {
      ...base, p_session_id: crypto.randomUUID(), p_review_id: firstId, p_card_id: "es-0011",
    })).error).not.toBeNull();
  });

  it("caps a session at twenty distinct reviews", async () => {
    const sessionId = crypto.randomUUID();
    for (let n = 100; n < 120; n += 1) {
      const result = await a.client.rpc("record_card_review", {
        p_review_id: crypto.randomUUID(), p_session_id: sessionId, p_lang_pair: "en-es",
        p_card_id: `es-${String(n).padStart(4, "0")}`, p_rating: 3, p_elapsed_ms: 500, p_next_state: state,
      });
      expect(result.error, `card ${n}`).toBeNull();
    }
    const overflow = await a.client.rpc("record_card_review", {
      p_review_id: crypto.randomUUID(), p_session_id: sessionId, p_lang_pair: "en-es",
      p_card_id: "es-0120", p_rating: 3, p_elapsed_ms: 500, p_next_state: state,
    });
    expect(overflow.error).not.toBeNull();
  });

  it("records and completes a study session exactly once", async () => {
    const reviewId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const args = {
      p_review_id: reviewId, p_session_id: sessionId, p_lang_pair: "en-es", p_card_id: "es-0001",
      p_rating: 4, p_elapsed_ms: 15_000, p_next_state: state,
    };
    const first = await a.client.rpc("record_card_review", args);
    expect(first.error).toBeNull();
    expect(first.data.replayed).toBe(false);
    const replay = await a.client.rpc("record_card_review", args);
    expect(replay.error).toBeNull();
    expect(replay.data.replayed).toBe(true);
    expect((await a.client.rpc("record_card_review", { ...args, p_rating: 1 })).error).not.toBeNull();

    const completionArgs = {
      p_session_id: sessionId, p_lang_pair: "en-es",
      p_started_at: new Date(Date.now() - 60_000).toISOString(), p_completed_at: new Date().toISOString(),
    };
    const completed = await a.client.rpc("complete_study_session", completionArgs);
    expect(completed.error).toBeNull();
    expect(() => StudyCompletionResultSchema.parse(completed.data)).not.toThrow();
    expect(completed.data.reviewXp).toBe(15);
    const localParts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date(completionArgs.p_completed_at)).map((part) => [part.type, part.value]));
    expect(completed.data.localStudyDate).toBe(`${localParts.year}-${localParts.month}-${localParts.day}`);
    expect(completed.data.replayed).toBe(false);
    const completedReplay = await a.client.rpc("complete_study_session", completionArgs);
    expect(completedReplay.error).toBeNull();
    expect(completedReplay.data.replayed).toBe(true);

    const staleCompletedAt = new Date(Date.now() - 10 * 60_000);
    const staleStartedAt = new Date(staleCompletedAt.getTime() - 60_000);
    const rewound = await admin.from("study_sessions").update({
      requested_started_at: staleStartedAt.toISOString(),
      requested_completed_at: staleCompletedAt.toISOString(),
    }).eq("user_id", a.id).eq("session_id", sessionId);
    expect(rewound.error).toBeNull();
    const staleReplay = await a.client.rpc("complete_study_session", {
      p_session_id: sessionId, p_lang_pair: "en-es",
      p_started_at: staleStartedAt.toISOString(), p_completed_at: staleCompletedAt.toISOString(),
    });
    expect(staleReplay.error).toBeNull();
    expect(staleReplay.data.replayed).toBe(true);
    expect((await a.client.rpc("complete_study_session", {
      p_session_id: sessionId, p_lang_pair: "en-es",
      p_started_at: new Date(staleStartedAt.getTime() - 1_000).toISOString(),
      p_completed_at: staleCompletedAt.toISOString(),
    })).error).not.toBeNull();

    const profile = await admin.from("profiles").select("xp").eq("user_id", a.id).single();
    expect(profile.data?.xp).toBe(completed.data.totalXpAwarded);
  });

  it("does not award forged unverified review rows", async () => {
    const sessionId = crypto.randomUUID();
    const forged = await admin.from("review_logs").insert({
      user_id: a.id, review_id: crypto.randomUUID(), session_id: sessionId,
      lang_pair: "en-es", card_id: "es-0200", rating: 4, elapsed_ms: 15_000,
      next_state: state, reward_eligible: false,
    });
    expect(forged.error).toBeNull();
    const before = await admin.from("profiles").select("xp").eq("user_id", a.id).single();
    const result = await a.client.rpc("complete_study_session", {
      p_session_id: sessionId, p_lang_pair: "en-es",
      p_started_at: new Date(Date.now() - 60_000).toISOString(),
      p_completed_at: new Date().toISOString(),
    });
    expect(result.error).not.toBeNull();
    const after = await admin.from("profiles").select("xp").eq("user_id", a.id).single();
    expect(after.data?.xp).toBe(before.data?.xp);
  });

  it("uses trusted prices and makes purchases idempotent", async () => {
    const requestId = crypto.randomUUID();
    const first = await a.client.rpc("purchase_item", { p_item_id: "Border-001", p_request_id: requestId });
    expect(first.error).toBeNull();
    expect(first.data.tokenCost).toBe(90);
    expect(first.data.balance).toBe(410);
    const replay = await a.client.rpc("purchase_item", { p_item_id: "Border-001", p_request_id: requestId });
    expect(replay.error).toBeNull();
    expect(replay.data.replayed).toBe(true);
    expect(replay.data.balance).toBe(410);
    expect((await a.client.rpc("purchase_item", { p_item_id: "Accent-001", p_request_id: requestId })).error).not.toBeNull();
    const equipRequestId = crypto.randomUUID();
    const equipped = await a.client.rpc("equip_item", { p_item_id: "Border-001", p_request_id: equipRequestId });
    expect(equipped.error).toBeNull();
    expect(equipped.data.equipped.slot).toBe("profile_border");
    const equipReplay = await a.client.rpc("equip_item", { p_item_id: "Border-001", p_request_id: equipRequestId });
    expect(equipReplay.error).toBeNull();
    expect(equipReplay.data.replayed).toBe(true);
    expect(equipReplay.data.replacedItemId).toBe(equipped.data.replacedItemId);
    expect((await a.client.rpc("equip_item", { p_item_id: "Accent-001", p_request_id: equipRequestId })).error).not.toBeNull();
  });

  it("pre-aggregates leaderboard rows and binds the true current-user rank to auth.uid", async () => {
    await admin.from("profiles").update({ xp: 1_000 }).eq("user_id", b.id);
    const achievements = await admin.from("user_achievements").upsert([
      { user_id: b.id, achievement_id: "Ach-001" },
      { user_id: b.id, achievement_id: "Ach-002" },
    ]);
    expect(achievements.error).toBeNull();
    const equipped = await admin.from("user_equipped").upsert([
      { user_id: b.id, slot: "profile_border", item_id: "Border-001" },
      { user_id: b.id, slot: "profile_picture", item_id: "StoreAvatar-001" },
    ]);
    expect(equipped.error).toBeNull();

    const board = await a.client.rpc("get_leaderboard", { n: 50 });
    expect(board.error).toBeNull();
    expect(board.data.find((row: { user_id: string }) => row.user_id === b.id)?.achievement_count).toBe(2);
    const current = await a.client.rpc("get_current_user_rank");
    expect(current.error).toBeNull();
    const currentRow = Array.isArray(current.data) ? current.data[0] : current.data;
    const boardRow = board.data.find((row: { user_id: string }) => row.user_id === a.id);
    expect(currentRow.user_id).toBe(a.id);
    expect(currentRow.rank).toBe(boardRow.rank);
    expect((await a.client.rpc("get_current_user_rank", { uid: b.id })).error).not.toBeNull();
  });
});
