import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DeckLoadError,
  clearWordDataCache,
  deckAssetUrl,
  loadAllWords,
} from "./wordData";

const card = {
  id: "es-0001",
  langPair: "en-es",
  word: "hola",
  translation: "hello",
  partOfSpeech: "interjection",
  exampleSentence: "Hola, Ana.",
  exampleTranslation: "Hello, Ana.",
  audio: "assets/audio/es/es-0001.mp3",
};

function response(data: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: vi.fn().mockResolvedValue(data),
  } as unknown as Response;
}

describe("wordData runtime boundary", () => {
  beforeEach(() => clearWordDataCache());
  afterEach(() => vi.unstubAllGlobals());

  it("parses, caches, and coalesces a valid deck", async () => {
    let resolveFetch!: (value: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => { resolveFetch = resolve; }));
    vi.stubGlobal("fetch", fetchMock);

    const first = loadAllWords("en-es", { baseUrl: "/1000-words/" });
    const second = loadAllWords("en-es", { baseUrl: "/1000-words/" });
    resolveFetch(response([card]));

    await expect(Promise.all([first, second])).resolves.toEqual([[card], [card]]);
    await loadAllWords("en-es", { baseUrl: "/1000-words/" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/1000-words/assets/data/en-es.json");
  });

  it("normalizes root and hosted asset bases", () => {
    expect(deckAssetUrl("en-es", "/")).toBe("/assets/data/en-es.json");
    expect(deckAssetUrl("en-es", "/1000-words")).toBe("/1000-words/assets/data/en-es.json");
  });

  it.each([
    ["not-found", response([], { ok: false, status: 404 })],
    ["http", response([], { ok: false, status: 503 })],
    ["invalid-schema", response([{ ...card, word: "" }])],
  ] as const)("returns a typed %s error", async (kind, fetchResponse) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fetchResponse));
    await expect(loadAllWords("en-es")).rejects.toMatchObject({ kind });
  });

  it("distinguishes invalid JSON and network failures", async () => {
    const invalidJson = response([]);
    vi.mocked(invalidJson.json).mockRejectedValueOnce(new SyntaxError("bad json"));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(invalidJson));
    await expect(loadAllWords("en-es")).rejects.toMatchObject({ kind: "invalid-json" });

    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new TypeError("offline")));
    await expect(loadAllWords("en-es")).rejects.toMatchObject({ kind: "network" });
  });

  it("rejects unsupported pairs before fetching", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(loadAllWords("en-fr")).rejects.toEqual(expect.any(DeckLoadError));
    await expect(loadAllWords("en-fr")).rejects.toMatchObject({ kind: "unsupported-language" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not cache failures so retry makes a new request", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(response([card]));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadAllWords("en-es")).rejects.toMatchObject({ kind: "network" });
    await expect(loadAllWords("en-es")).resolves.toEqual([card]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects a valid deck whose cards belong to another language pair", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response([{ ...card, id: "zh-0001", langPair: "en-zh" }]),
      ),
    );

    await expect(loadAllWords("en-es")).rejects.toMatchObject({
      kind: "invalid-schema",
      langPair: "en-es",
    });
  });

  it("rejects duplicate card ids in a deck", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([card, { ...card, word: "adios" }])));
    await expect(loadAllWords("en-es")).rejects.toMatchObject({ kind: "invalid-schema" });
  });

  it.each([
    [{ ...card, id: "zh-0001" }, "registered card id prefix"],
    [{ ...card, audio: "assets/audio/zh/es-0001.mp3" }, "registered audio directory"],
    [{ ...card, audio: "assets/audio/es/nested/es-0001.mp3" }, "exact registered audio directory"],
  ])("rejects cards outside the %s", async (invalidCard) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([invalidCard])));
    await expect(loadAllWords("en-es")).rejects.toMatchObject({ kind: "invalid-schema" });
  });

  it("accepts a validated empty deck", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([])));
    await expect(loadAllWords("en-es")).resolves.toEqual([]);
  });
});
