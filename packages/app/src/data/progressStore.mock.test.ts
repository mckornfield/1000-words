import { describe, expect, it, vi } from "vitest";
import type { FsrsState } from "@1000words/engine";
import { createMockProgressStore } from "./progressStore.mock";

const state: FsrsState = {
  due: "2026-07-27T00:00:00.000Z",
  stability: 1,
  difficulty: 1,
  elapsedDays: 0,
  scheduledDays: 1,
  learningSteps: 0,
  reps: 1,
  lapses: 0,
  state: 1,
  lastReview: "2026-07-26T00:00:00.000Z",
};

function failingStorage(initial?: Record<string, unknown>): Storage {
  const serialized = initial ? JSON.stringify(initial) : null;
  return {
    get length() { return 0; },
    clear: vi.fn(),
    getItem: vi.fn(() => {
      if (serialized !== null) return serialized;
      throw new Error("storage read failed");
    }),
    key: vi.fn(() => null),
    removeItem: vi.fn(),
    setItem: vi.fn(() => { throw new Error("storage write failed"); }),
  };
}

describe("createMockProgressStore storage fallback", () => {
  it("provides read-after-write when storage reads and writes fail", async () => {
    const store = createMockProgressStore({ storage: failingStorage() });

    await store.upsertProgress("user-1", "es-0001", state);

    await expect(store.getProgress("user-1", "en-es")).resolves.toEqual({ "es-0001": state });
  });

  it("retains loaded progress and new writes in memory when persistence fails", async () => {
    const existing = { "es-0001": state };
    const store = createMockProgressStore({ storage: failingStorage(existing) });
    const nextState = { ...state, reps: 2 };

    expect(await store.getProgress("user-1", "en-es")).toEqual(existing);
    await store.upsertProgress("user-1", "es-0002", nextState);

    await expect(store.getProgress("user-1", "en-es")).resolves.toEqual({
      ...existing,
      "es-0002": nextState,
    });
  });
});
