import { describe, expect, it } from "vitest";
import type { Card } from "@1000words/content";
import { initialState, scheduleReview, buildSession } from "./index";
import type { FsrsState, ProgressMap } from "./types";

const NOW = new Date("2026-06-07T00:00:00Z");

const card = (id: string): Card => ({
  id,
  langPair: "en-es",
  word: `w-${id}`,
  translation: `t-${id}`,
  exampleSentence: "Hola.",
  exampleTranslation: "Hello.",
  audio: `assets/audio/es/${id}.mp3`,
});

describe("initialState", () => {
  it("returns a fresh, serializable FSRS state", () => {
    const s = initialState(NOW);
    expect(s.reps).toBe(0);
    expect(s.lapses).toBe(0);
    expect(typeof s.due).toBe("string");
    expect(s.lastReview).toBeNull();
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

describe("scheduleReview", () => {
  it("advances reps and stamps lastReview to `now` for any rating", () => {
    const start = initialState(NOW);
    for (const rating of ["again", "hard", "good", "easy"] as const) {
      const next = scheduleReview(start, rating, NOW);
      expect(next.reps).toBe(1);
      expect(next.lastReview).toBe(NOW.toISOString());
    }
  });

  it("schedules due >= now (no past-due cards from a fresh review)", () => {
    const start = initialState(NOW);
    for (const rating of ["again", "hard", "good", "easy"] as const) {
      const next = scheduleReview(start, rating, NOW);
      expect(new Date(next.due).getTime()).toBeGreaterThanOrEqual(NOW.getTime());
    }
  });

  it("'easy' schedules further out than 'good', which is further than 'again'", () => {
    const start = initialState(NOW);
    const again = new Date(scheduleReview(start, "again", NOW).due).getTime();
    const good = new Date(scheduleReview(start, "good", NOW).due).getTime();
    const easy = new Date(scheduleReview(start, "easy", NOW).due).getTime();
    expect(good).toBeGreaterThan(again);
    expect(easy).toBeGreaterThan(good);
  });

  it("'again' on a card already in Review state increments lapses", () => {
    let s = initialState(NOW);
    // Drive the card into the Review state with successful reviews.
    s = scheduleReview(s, "good", NOW);
    const t1 = new Date(s.due);
    s = scheduleReview(s, "good", t1);
    const lapsesBefore = s.lapses;
    const next = scheduleReview(s, "again", new Date(s.due));
    expect(next.lapses).toBe(lapsesBefore + 1);
  });

  it("result is JSON round-trip stable", () => {
    const start = initialState(NOW);
    const next = scheduleReview(start, "good", NOW);
    expect(JSON.parse(JSON.stringify(next))).toEqual(next);
  });

  it("is pure — does not mutate the input state", () => {
    const start = initialState(NOW);
    const snapshot = JSON.parse(JSON.stringify(start));
    scheduleReview(start, "good", NOW);
    expect(start).toEqual(snapshot);
  });
});

describe("buildSession", () => {
  const cards = [card("es-0001"), card("es-0002"), card("es-0003"), card("es-0004")];

  function dueState(due: Date): FsrsState {
    return { ...initialState(NOW), due: due.toISOString() };
  }

  it("returns [] for an empty deck", () => {
    expect(buildSession([], {}, { now: NOW, newCardsPerDay: 5, maxCards: 10 })).toEqual([]);
  });

  it("excludes cards whose due date is in the future", () => {
    const future = new Date(NOW.getTime() + 86400_000);
    const progress: ProgressMap = { "es-0001": dueState(future) };
    const session = buildSession(cards.slice(0, 1), progress, {
      now: NOW,
      newCardsPerDay: 0,
      maxCards: 10,
    });
    expect(session).toEqual([]);
  });

  it("includes due cards ordered by due date ascending", () => {
    const t0 = new Date(NOW.getTime() - 3 * 86400_000);
    const t1 = new Date(NOW.getTime() - 2 * 86400_000);
    const t2 = new Date(NOW.getTime() - 1 * 86400_000);
    const progress: ProgressMap = {
      "es-0002": dueState(t2),
      "es-0001": dueState(t0),
      "es-0003": dueState(t1),
    };
    const session = buildSession(cards.slice(0, 3), progress, {
      now: NOW,
      newCardsPerDay: 0,
      maxCards: 10,
    });
    expect(session.map((c) => c.id)).toEqual(["es-0001", "es-0003", "es-0002"]);
  });

  it("introduces up to newCardsPerDay unseen cards after due cards", () => {
    const past = new Date(NOW.getTime() - 86400_000);
    const progress: ProgressMap = { "es-0001": dueState(past) };
    const session = buildSession(cards, progress, {
      now: NOW,
      newCardsPerDay: 2,
      maxCards: 10,
    });
    expect(session.map((c) => c.id)).toEqual(["es-0001", "es-0002", "es-0003"]);
  });

  it("caps the total at maxCards (due cards first, then new)", () => {
    const past = new Date(NOW.getTime() - 86400_000);
    const progress: ProgressMap = {
      "es-0001": dueState(past),
      "es-0002": dueState(past),
    };
    const session = buildSession(cards, progress, {
      now: NOW,
      newCardsPerDay: 5,
      maxCards: 3,
    });
    expect(session.map((c) => c.id)).toEqual(["es-0001", "es-0002", "es-0003"]);
  });

  it("returns only new cards when no cards are due", () => {
    const session = buildSession(cards, {}, {
      now: NOW,
      newCardsPerDay: 2,
      maxCards: 10,
    });
    expect(session.map((c) => c.id)).toEqual(["es-0001", "es-0002"]);
  });

  it("newCardsPerDay=0 introduces no unseen cards", () => {
    const session = buildSession(cards, {}, {
      now: NOW,
      newCardsPerDay: 0,
      maxCards: 10,
    });
    expect(session).toEqual([]);
  });
});
