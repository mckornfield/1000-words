import { describe, expect, it } from "vitest";
import { initialState, scheduleReview, buildSession } from "./index";

describe("engine (Phase 0 contract)", () => {
  it("initialState returns a fresh, serializable FSRS state", () => {
    const s = initialState(new Date("2026-06-07T00:00:00Z"));
    expect(s.reps).toBe(0);
    expect(s.lapses).toBe(0);
    expect(typeof s.due).toBe("string");
    expect(s.lastReview).toBeNull();
    // Must survive a JSON round-trip (it is persisted to Postgres).
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });

  // The real behavior is delivered under task A1 (TDD). These pin the contract
  // and document that the implementations are intentionally pending.
  it("scheduleReview is a function pending A1 implementation", () => {
    expect(typeof scheduleReview).toBe("function");
    expect(() => scheduleReview(initialState(), "good")).toThrow(/A1/);
  });

  it("buildSession is a function pending A1 implementation", () => {
    expect(typeof buildSession).toBe("function");
    expect(() => buildSession([], {})).toThrow(/A1/);
  });
});
