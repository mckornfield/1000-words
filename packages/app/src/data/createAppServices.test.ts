import { describe, expect, it } from "vitest";
import type { FsrsState } from "@1000words/engine";
import { localAccountRepository } from "./account/repository";
import { createAppServices } from "./createAppServices";

const seedData = localAccountRepository.getDashboardData("Usr-001");
const fixedNow = new Date("2026-07-26T12:34:56.000Z");
const clock = { now: () => new Date(fixedNow) };

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

const state: FsrsState = {
  due: fixedNow.toISOString(), stability: 1, difficulty: 1, elapsedDays: 0,
  scheduledDays: 0, learningSteps: 0, reps: 1, lapses: 0, state: 1,
  lastReview: fixedNow.toISOString(),
};

describe("createAppServices", () => {
  it("keeps one deterministic demo graph state across repository reads", async () => {
    const services = createAppServices({
      mode: "demo", userId: "Usr-001", seedData, clock, storage: createMemoryStorage(),
    });

    await services.inventoryRepo.purchase({ itemId: "StoreAvatar-002", requestId: crypto.randomUUID() });

    expect((await services.profileRepo.getProfile(services.userId)).xp).toBe(seedData.profile.xp);
    expect((await services.profileRepo.getProfile(services.userId)).tokens).toBe(seedData.profile.tokens - 160);
    expect((await services.goalRepo.getTodayGoals(services.userId)).find((g) => g.goalType === "Goal-001")?.current).toBe(1);
    const firstInventory = await services.inventoryRepo.getInventory(services.userId);
    const secondInventory = await services.inventoryRepo.getInventory(services.userId);
    expect(secondInventory).toEqual(firstInventory);
    expect(firstInventory.find((item) => item.itemId === "StoreAvatar-002")?.purchasedAt).toBe(fixedNow.toISOString());
    expect(await services.statsRepo.getWeeklyXp(services.userId, "2026-07-20")).toEqual(
      await services.statsRepo.getWeeklyXp(services.userId, "2026-07-20"),
    );
  });

  it("isolates all four language progress keys and rejects unknown card prefixes", async () => {
    const storage = createMemoryStorage();
    const services = createAppServices({ mode: "demo", userId: "Usr-001", seedData, clock, storage });

    for (const cardId of ["es-0001", "zh-0001", "ko-0001", "ja-0001"]) {
      await services.progressStore.upsertProgress(services.userId, cardId, state);
    }

    expect(Object.keys(await services.progressStore.getProgress(services.userId, "en-es"))).toEqual(["es-0001"]);
    expect(Object.keys(await services.progressStore.getProgress(services.userId, "en-zh"))).toEqual(["zh-0001"]);
    expect(Object.keys(await services.progressStore.getProgress(services.userId, "en-ko"))).toEqual(["ko-0001"]);
    expect(Object.keys(await services.progressStore.getProgress(services.userId, "en-ja"))).toEqual(["ja-0001"]);
    await expect(services.progressStore.upsertProgress(services.userId, "xx-0001", state)).rejects.toThrow("Cannot derive langPair");
  });

  it("resets the shared demo graph only through the explicit reset command", async () => {
    const graph = createAppServices({ mode: "demo", userId: "Usr-001", seedData, clock, storage: createMemoryStorage() });
    await graph.inventoryRepo.purchase({ itemId: "StoreAvatar-002", requestId: crypto.randomUUID() });

    await graph.resetDemoData?.();

    expect((await graph.profileRepo.getProfile(graph.userId)).xp).toBe(seedData.profile.xp);
    expect((await graph.goalRepo.getTodayGoals(graph.userId)).find((goal) => goal.goalType === "Goal-001")?.current).toBe(1);
    expect((await graph.inventoryRepo.getInventory(graph.userId)).some((item) => item.itemId === "StoreAvatar-002")).toBe(false);
  });

  it("preserves persisted demo progress on dispose and clears it only on explicit reset", async () => {
    const storage = createMemoryStorage();
    const first = createAppServices({ mode: "demo", userId: "Usr-001", seedData, clock, storage });
    await first.progressStore.upsertProgress(first.userId, "ko-0001", state);
    first.dispose();

    const restored = createAppServices({ mode: "demo", userId: "Usr-001", seedData, clock, storage });
    expect(await restored.progressStore.getProgress(restored.userId, "en-ko")).toHaveProperty("ko-0001");
    await restored.resetDemoData?.();

    const reset = createAppServices({ mode: "demo", userId: "Usr-001", seedData, clock, storage });
    expect(await reset.progressStore.getProgress(reset.userId, "en-ko")).toEqual({});
    expect(reset).not.toBe(restored);
  });

  it("applies session completion to the shared demo goal state", async () => {
    const services = createAppServices({ mode: "demo", userId: "Usr-001", seedData, clock, storage: createMemoryStorage() });
    const sessionId = "00000000-0000-4000-8000-000000000020";
    await services.studyRepo.recordCardReview({
      reviewId: "00000000-0000-4000-8000-000000000021",
      sessionId,
      langPair: "en-es",
      cardId: "es-0001",
      rating: "good",
      elapsedMs: 1000,
      nextState: state,
    });
    const completion = await services.studyRepo.completeStudySession({
      sessionId,
      langPair: "en-es",
      startedAt: "2026-07-26T12:33:56.000Z",
      completedAt: fixedNow.toISOString(),
    });

    const goals = await services.goalRepo.getTodayGoals(services.userId);
    expect(goals.find((goal) => goal.goalType === "Goal-001")?.current).toBe(2);
    expect(goals.find((goal) => goal.goalType === "Goal-002")?.current).toBe(250);
    expect(completion.goals).toEqual(goals);
  });
});
