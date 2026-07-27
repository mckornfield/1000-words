import { describe, expect, it, vi } from "vitest";
import type { AppServices, AppProfile } from "./types";
import { createRefreshCoordinator } from "./refreshCoordinator";

const profile: AppProfile = {
  userId: "user-1", displayName: "Ari", bio: "", xp: 10, tokens: 20,
  streakCount: 1, lastActiveDate: null, createdAt: null,
  settings: {
    themePreference: "system", dailyGoalMinutes: 15, autoAdvance: false,
    notifications: { streak: true, goalComplete: true, xpMilestone: false },
  },
};

function services(overrides: Partial<AppServices> = {}): AppServices {
  return {
    mode: "demo", userId: "user-1", catalog: { lessons: [], achievements: [], storeItems: [] },
    progressStore: {} as AppServices["progressStore"],
    studyRepo: {} as AppServices["studyRepo"],
    profileRepo: { getProfile: vi.fn(async () => profile) } as unknown as AppServices["profileRepo"],
    achievementRepo: { getUserAchievements: vi.fn(async () => []) } as unknown as AppServices["achievementRepo"],
    inventoryRepo: {
      getInventory: vi.fn(async () => []), getEquipped: vi.fn(async () => []),
    } as unknown as AppServices["inventoryRepo"],
    goalRepo: { getTodayGoals: vi.fn(async () => []) } as unknown as AppServices["goalRepo"],
    statsRepo: { getWeeklyXp: vi.fn(async () => []) },
    leaderboardRepo: {
      getTopN: vi.fn(async () => []), getCurrentUserEntry: vi.fn(async () => null),
    },
    dispose() {},
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe("refresh coordinator", () => {
  it("loads a named domain, publishes pending state, and versions only successful results", async () => {
    const pending = deferred<AppProfile>();
    const graph = services({
      profileRepo: { getProfile: vi.fn(() => pending.promise) } as unknown as AppServices["profileRepo"],
    });
    const coordinator = createRefreshCoordinator(graph);
    const listener = vi.fn();
    coordinator.subscribe(listener);

    const refresh = coordinator.refresh(["profile"]);
    expect(coordinator.getState().pending.has("profile")).toBe(true);
    expect(coordinator.getState().versions.profile).toBe(0);
    pending.resolve(profile);
    await refresh;

    expect(coordinator.getState().snapshot.profile).toEqual(profile);
    expect(coordinator.getState().pending.has("profile")).toBe(false);
    expect(coordinator.getState().versions.profile).toBe(1);
    expect(listener).toHaveBeenCalled();
  });

  it("queues one fresh domain load when refresh is requested during an older load", async () => {
    const firstPending = deferred<AppProfile>();
    const secondPending = deferred<AppProfile>();
    const getProfile = vi.fn()
      .mockImplementationOnce(() => firstPending.promise)
      .mockImplementationOnce(() => secondPending.promise);
    const coordinator = createRefreshCoordinator(services({ profileRepo: { getProfile } as unknown as AppServices["profileRepo"] }));

    const first = coordinator.refresh(["profile"]);
    const second = coordinator.refresh(["profile"]);
    expect(getProfile).toHaveBeenCalledTimes(1);
    firstPending.resolve(profile);
    await first;
    expect(getProfile).toHaveBeenCalledTimes(2);
    expect(coordinator.getState().pending.has("profile")).toBe(true);
    secondPending.resolve({ ...profile, xp: 20 });
    await second;
    expect(coordinator.getState().snapshot.profile?.xp).toBe(20);
    expect(coordinator.getState().versions.profile).toBe(1);
    expect(coordinator.getState().pending.has("profile")).toBe(false);
  });

  it("preserves the prior authoritative value and records an error on failure", async () => {
    const getProfile = vi.fn()
      .mockResolvedValueOnce(profile)
      .mockRejectedValueOnce(new Error("offline"));
    const coordinator = createRefreshCoordinator(services({ profileRepo: { getProfile } as unknown as AppServices["profileRepo"] }));
    await coordinator.refresh(["profile"]);
    await coordinator.refresh(["profile"]);

    expect(coordinator.getState().snapshot.profile).toEqual(profile);
    expect(coordinator.getState().errors.profile?.message).toBe("offline");
    expect(coordinator.getState().versions.profile).toBe(1);
  });

  it("ignores stale completions after disposal and supports command-result patching", async () => {
    const pending = deferred<AppProfile>();
    const coordinator = createRefreshCoordinator(services({
      profileRepo: { getProfile: vi.fn(() => pending.promise) } as unknown as AppServices["profileRepo"],
    }));
    coordinator.patch({ profile });
    expect(coordinator.getState().versions.profile).toBe(1);

    const refresh = coordinator.refresh(["profile"]);
    coordinator.dispose();
    pending.resolve({ ...profile, xp: 999 });
    await refresh;
    expect(coordinator.getState().snapshot.profile?.xp).toBe(10);
  });

  it("does not let an older refresh overwrite a newer command-result patch", async () => {
    const pending = deferred<AppProfile>();
    const coordinator = createRefreshCoordinator(services({
      profileRepo: { getProfile: vi.fn(() => pending.promise) } as unknown as AppServices["profileRepo"],
    }));
    const refresh = coordinator.refresh(["profile"]);
    coordinator.patch({ profile: { ...profile, xp: 500 } });
    pending.resolve({ ...profile, xp: 10 });
    await refresh;
    expect(coordinator.getState().snapshot.profile?.xp).toBe(500);
    expect(coordinator.getState().pending.has("profile")).toBe(false);
  });

  it("preserves a mutation patch while loading a fresh post-mutation snapshot", async () => {
    const oldPending = deferred<AppProfile>();
    const freshPending = deferred<AppProfile>();
    const getProfile = vi.fn()
      .mockImplementationOnce(() => oldPending.promise)
      .mockImplementationOnce(() => freshPending.promise);
    const coordinator = createRefreshCoordinator(services({ profileRepo: { getProfile } as unknown as AppServices["profileRepo"] }));

    const oldRefresh = coordinator.refresh(["profile"]);
    coordinator.patch({ profile: { ...profile, xp: 500 } });
    const freshRefresh = coordinator.refresh(["profile"]);
    oldPending.resolve({ ...profile, xp: 10 });
    await oldRefresh;
    expect(coordinator.getState().snapshot.profile?.xp).toBe(500);
    freshPending.resolve({ ...profile, xp: 600 });
    await freshRefresh;

    expect(coordinator.getState().snapshot.profile?.xp).toBe(600);
    expect(coordinator.getState().versions.profile).toBe(2);
  });

  it("queues a fresh domain load when invalidated during an older request", async () => {
    const oldPending = deferred<AppProfile>();
    const freshPending = deferred<AppProfile>();
    const getProfile = vi.fn()
      .mockImplementationOnce(() => oldPending.promise)
      .mockImplementationOnce(() => freshPending.promise);
    const coordinator = createRefreshCoordinator(services({ profileRepo: { getProfile } as unknown as AppServices["profileRepo"] }));

    const oldRefresh = coordinator.refresh(["profile"]);
    coordinator.invalidate(["profile"]);
    oldPending.resolve(profile);
    await oldRefresh;
    await vi.waitFor(() => expect(getProfile).toHaveBeenCalledTimes(2));
    freshPending.resolve({ ...profile, xp: 30 });
    await vi.waitFor(() => expect(coordinator.getState().snapshot.profile?.xp).toBe(30));

    expect(coordinator.getState().versions.profile).toBe(2);
    expect(coordinator.getState().pending.has("profile")).toBe(false);
  });

  it("loads leaderboard entries and current user as one domain snapshot", async () => {
    const entry = { userId: "user-1", displayName: "Ari", xp: 10, level: 1, achievementCount: 0, rankValue: 1, rank: 1, equippedBorderId: null, equippedBadgeId: null, equippedAvatarId: null };
    const coordinator = createRefreshCoordinator(services({
      leaderboardRepo: { getTopN: vi.fn(async () => [entry]), getCurrentUserEntry: vi.fn(async () => entry) },
    }));
    await coordinator.refresh(["leaderboard"]);
    expect(coordinator.getState().snapshot.leaderboard).toEqual({ entries: [entry], currentUser: entry });
  });
});
