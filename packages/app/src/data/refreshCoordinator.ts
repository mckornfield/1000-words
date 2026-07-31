import type {
  AppServices, RefreshCoordinator, RefreshDomain, RefreshState, UserStateSnapshot,
} from "./types";

const domains: readonly RefreshDomain[] = [
  "profile", "goals", "achievements", "inventory", "equipped", "stats", "leaderboard",
];

function emptySnapshot(): UserStateSnapshot {
  return {
    profile: null,
    goals: [],
    achievements: [],
    inventory: [],
    equipped: [],
    stats: [],
    leaderboard: { entries: [], currentUser: null },
  };
}

function initialVersions(): Record<RefreshDomain, number> {
  return Object.fromEntries(domains.map((domain) => [domain, 0])) as Record<RefreshDomain, number>;
}

type DomainValue = UserStateSnapshot[RefreshDomain];
type LoadResult = {
  domain: RefreshDomain;
  generation: number;
  version: number;
  value?: DomainValue;
  error?: Error;
  applied: boolean;
};

function asError(reason: unknown): Error {
  return reason instanceof Error ? reason : new Error(String(reason));
}

export function createRefreshCoordinator(services: AppServices): RefreshCoordinator {
  let generation = 0;
  let disposed = false;
  let state: RefreshState = {
    snapshot: emptySnapshot(),
    pending: new Set(),
    errors: {},
    versions: initialVersions(),
  };
  const listeners = new Set<() => void>();
  const inFlight = new Map<RefreshDomain, Promise<LoadResult>>();
  const queued = new Map<RefreshDomain, Promise<LoadResult>>();

  const publish = (next: RefreshState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  const load = async (domain: RefreshDomain): Promise<DomainValue> => {
    const userId = services.userId;
    switch (domain) {
      case "profile": return services.profileRepo.getProfile(userId);
      case "goals": return services.goalRepo.getTodayGoals(userId);
      case "achievements": return services.achievementRepo.getUserAchievements(userId);
      case "inventory": return services.inventoryRepo.getInventory(userId);
      case "equipped": return services.inventoryRepo.getEquipped(userId);
      case "stats": {
        const since = new Date(Date.now() - 6 * 86_400_000).toISOString();
        return services.statsRepo.getWeeklyXp(userId, since);
      }
      case "leaderboard": {
        const [entries, currentUser] = await Promise.all([
          services.leaderboardRepo.getTopN(100),
          services.leaderboardRepo.getCurrentUserEntry(userId),
        ]);
        return { entries, currentUser };
      }
    }
  };

  const startRequest = (domain: RefreshDomain): Promise<LoadResult> => {
    const requestGeneration = generation;
    const requestVersion = state.versions[domain];
    const promise = load(domain)
      .then((value) => ({ domain, generation: requestGeneration, version: requestVersion, value, applied: false } satisfies LoadResult))
      .catch((reason) => ({ domain, generation: requestGeneration, version: requestVersion, error: asError(reason), applied: false } satisfies LoadResult))
      .finally(() => {
        if (inFlight.get(domain) === promise) inFlight.delete(domain);
      });
    inFlight.set(domain, promise);
    return promise;
  };

  const request = (domain: RefreshDomain): Promise<LoadResult> => {
    const existing = inFlight.get(domain);
    if (!existing) return startRequest(domain);
    const alreadyQueued = queued.get(domain);
    if (alreadyQueued) return alreadyQueued;
    const promise = existing.then(() => {
      queued.delete(domain);
      return startRequest(domain);
    });
    queued.set(domain, promise);
    void promise.finally(() => {
      if (queued.get(domain) === promise) queued.delete(domain);
    });
    return promise;
  };

  const refresh: RefreshCoordinator["refresh"] = async (requestedDomains) => {
    if (disposed) return;
    const unique = [...new Set(requestedDomains)];
    if (unique.length === 0) return;
    const nextPending = new Set(state.pending);
    unique.forEach((domain) => nextPending.add(domain));
    publish({ ...state, pending: nextPending });

    const results = await Promise.all(unique.map(request));
    if (disposed) return;
    const snapshot = { ...state.snapshot };
    const pending = new Set(state.pending);
    const errors = { ...state.errors };
    const versions = { ...state.versions };
    let changed = false;
    for (const result of results) {
      if (result.applied) continue;
      result.applied = true;
      const superseded = inFlight.has(result.domain) || queued.has(result.domain);
      if (!superseded) pending.delete(result.domain);
      if (superseded) {
        changed = true;
        continue;
      }
      if (result.generation !== generation) continue;
      if (result.version !== state.versions[result.domain]) {
        changed = true;
        continue;
      }
      changed = true;
      if (result.error) {
        errors[result.domain] = result.error;
      } else {
        (snapshot as Record<RefreshDomain, DomainValue>)[result.domain] = result.value as DomainValue;
        delete errors[result.domain];
        versions[result.domain] += 1;
      }
    }
    if (changed) publish({ snapshot, pending, errors, versions });
  };

  return {
    getState: () => state,
    subscribe(listener) {
      if (disposed) return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    refresh,
    patch(patch) {
      if (disposed) return;
      const versions = { ...state.versions };
      (Object.keys(patch) as RefreshDomain[]).forEach((domain) => { versions[domain] += 1; });
      publish({ ...state, snapshot: { ...state.snapshot, ...patch }, versions });
    },
    invalidate(invalidatedDomains) {
      if (disposed) return;
      const unique = [...new Set(invalidatedDomains)];
      const reload = unique.filter((domain) => inFlight.has(domain) || queued.has(domain));
      const versions = { ...state.versions };
      unique.forEach((domain) => { versions[domain] += 1; });
      publish({ ...state, versions });
      if (reload.length > 0) void refresh(reload);
    },
    dispose() {
      disposed = true;
      generation += 1;
      listeners.clear();
      inFlight.clear();
      queued.clear();
    },
  };
}
