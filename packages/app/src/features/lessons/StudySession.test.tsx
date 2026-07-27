import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { localAccountRepository } from "../../data/account/repository";
import { createTestServices } from "../../test/createTestServices";
import { renderApp } from "../../test/renderApp";
import { DeckLoadError, loadWordsForLangPair } from "../../lib/wordData";
import { StudySession } from "./StudySession";
import type { RecordCardReviewCommand, RecordedCardReview, StudyCompletionResult } from "../../data/types";

vi.mock("../../lib/router", () => ({ navigate: vi.fn() }));
vi.mock("../../config/appConfig", () => ({
  appConfig: { demoLoginEnabled: true, reverseStudyEnabled: true },
}));
vi.mock("../../lib/wordData", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/wordData")>();
  return { ...actual, loadWordsForLangPair: vi.fn() };
});
const speechMocks = vi.hoisted(() => ({
  isSupported: vi.fn(() => false),
  recognize: vi.fn<() => Promise<string>>(),
}));
vi.mock("../../lib/speechRecognition", () => ({
  isSpeechRecognitionSupported: speechMocks.isSupported,
  recognizeSpeech: speechMocks.recognize,
}));

const dashboardData = localAccountRepository.getDashboardData("Usr-001");
const card = {
  id: "es-0001",
  langPair: "en-es" as const,
  word: "hola",
  translation: "hello",
  partOfSpeech: "interjection",
  exampleSentence: "Hola, Ana.",
  exampleTranslation: "Hello, Ana.",
  audio: "assets/audio/es/es-0001.mp3",
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

function renderStudy(services = createTestServices()) {
  return renderApp(
    <StudySession dashboardData={dashboardData} langPair="en-es" sessionTitle="Spanish" />,
    { services },
  );
}

describe("StudySession load recovery", () => {
  beforeEach(() => {
    vi.mocked(loadWordsForLangPair).mockReset();
    speechMocks.isSupported.mockReturnValue(false);
    speechMocks.recognize.mockReset();
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  });

  it("shows an accessible typed failure and retries without synthetic cards", async () => {
    const user = userEvent.setup();
    vi.mocked(loadWordsForLangPair)
      .mockRejectedValueOnce(new DeckLoadError("not-found", "en-es", "missing"))
      .mockResolvedValueOnce([]);

    renderStudy();

    const heading = await screen.findByRole("heading", { name: "Cards unavailable" });
    expect(heading).toHaveFocus();
    expect(screen.getByText(/Spanish/)).toBeInTheDocument();
    expect(screen.queryByText("Word 1")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "Nothing due" })).toBeInTheDocument();
    expect(loadWordsForLangPair).toHaveBeenCalledTimes(2);
  });

  it("renders an explicit empty state for a validated empty deck", async () => {
    vi.mocked(loadWordsForLangPair).mockResolvedValue([]);
    renderStudy();
    expect(await screen.findByRole("heading", { name: "Nothing due" })).toBeInTheDocument();
    expect(screen.queryByText("Loading cards…")).not.toBeInTheDocument();
  });

  it("feature-gates a reversible English-to-target study direction", async () => {
    const user = userEvent.setup();
    vi.mocked(loadWordsForLangPair).mockResolvedValue([card]);
    const { container } = renderStudy();
    await screen.findByRole("button", { name: "Click to reveal answer" });
    expect(container.querySelector(".flashcard-front")).toHaveTextContent("hola");

    await user.click(screen.getByRole("button", { name: "Switch study direction" }));
    expect(screen.getByRole("button", { name: "Switch study direction" })).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector(".flashcard-front")).toHaveTextContent("hello");
  });

  it("resets completed session state when the language pair changes", async () => {
    const user = userEvent.setup();
    const zhCard = {
      ...card,
      id: "zh-0001",
      langPair: "en-zh" as const,
      word: "你好",
      translation: "hello",
    };
    vi.mocked(loadWordsForLangPair)
      .mockResolvedValueOnce([card])
      .mockResolvedValueOnce([zhCard]);

    const { rerender } = renderApp(
      <StudySession dashboardData={dashboardData} langPair="en-es" sessionTitle="Spanish" />,
    );
    await user.click(await screen.findByRole("button", { name: "Click to reveal answer" }));
    await user.click(screen.getByRole("button", { name: "Rate as good" }));
    expect(await screen.findByRole("heading", { name: "Perfect!" })).toBeInTheDocument();

    rerender(
      <StudySession dashboardData={dashboardData} langPair="en-zh" sessionTitle="Mandarin" />,
    );

    expect(await screen.findByRole("button", { name: "Click to reveal answer" })).toBeInTheDocument();
    expect(screen.getByText("Mandarin")).toBeInTheDocument();
    expect(screen.getAllByText("你好")).toHaveLength(2);
    expect(screen.queryByRole("heading", { name: "Perfect!" })).not.toBeInTheDocument();
  });

  it("refreshes every affected user domain after study completion", async () => {
    const user = userEvent.setup();
    const refresh = vi.fn(async () => {});
    vi.mocked(loadWordsForLangPair).mockResolvedValue([card]);
    renderStudy({ ...createTestServices(), refresh });

    await user.click(await screen.findByRole("button", { name: "Click to reveal answer" }));
    await user.click(screen.getByRole("button", { name: "Rate as good" }));

    await waitFor(() => expect(refresh).toHaveBeenCalledWith([
      "profile", "goals", "achievements", "stats", "leaderboard",
    ]));
  });

  it("blocks the session and all mutations when progress loading fails", async () => {
    vi.mocked(loadWordsForLangPair).mockResolvedValue([card]);
    const upsertProgress = vi.fn();
    const logReview = vi.fn();
    const recordCardReview = vi.fn();
    const completeStudySession = vi.fn();
    const base = createTestServices();
    renderStudy({
      ...base,
      progressStore: {
        getProgress: vi.fn().mockRejectedValue(new Error("progress offline")),
        upsertProgress,
        logReview,
      },
      studyRepo: { recordCardReview, completeStudySession },
    });

    expect(await screen.findByRole("heading", { name: "Progress unavailable" })).toBeInTheDocument();
    await waitFor(() => expect(upsertProgress).not.toHaveBeenCalled());
    expect(logReview).not.toHaveBeenCalled();
    expect(recordCardReview).not.toHaveBeenCalled();
    expect(completeStudySession).not.toHaveBeenCalled();
  });

  it("does not advance on review failure and retries the identical review command", async () => {
    const user = userEvent.setup();
    vi.mocked(loadWordsForLangPair).mockResolvedValue([card, { ...card, id: "es-0002", word: "adios" }]);
    const recordCardReview = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockImplementation(async (command) => ({ ...command, reviewedAt: new Date().toISOString(), progress: command.nextState, replayed: false }));
    const base = createTestServices();
    renderStudy({ ...base, studyRepo: { ...base.studyRepo, recordCardReview } });
    await user.click(await screen.findByRole("button", { name: "Click to reveal answer" }));
    await user.click(screen.getByRole("button", { name: "Rate as good" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be saved");
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry review" }));
    await waitFor(() => expect(screen.getByText("2 / 2")).toBeInTheDocument());
    expect(recordCardReview.mock.calls[1]![0]).toEqual(recordCardReview.mock.calls[0]![0]);
  });

  it("blocks rating shortcuts after a response-loss error until the stored command is retried", async () => {
    const user = userEvent.setup();
    vi.mocked(loadWordsForLangPair).mockResolvedValue([card, { ...card, id: "es-0002", word: "adios" }]);
    const recordCardReview = vi.fn().mockRejectedValueOnce(new Error("response lost")).mockImplementation(async (command) => ({
      ...command, reviewedAt: new Date().toISOString(), progress: command.nextState, replayed: true,
    }));
    const base = createTestServices();
    renderStudy({ ...base, studyRepo: { ...base.studyRepo, recordCardReview } });
    await user.click(await screen.findByRole("button", { name: "Click to reveal answer" }));
    await user.keyboard("3");
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be saved");
    await user.keyboard("3");
    expect(recordCardReview).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Retry review" }));
    await waitFor(() => expect(recordCardReview).toHaveBeenCalledTimes(2));
    expect(recordCardReview.mock.calls[1]![0]).toEqual(recordCardReview.mock.calls[0]![0]);
  });

  it("retries session completion with the identical idempotency command", async () => {
    const user = userEvent.setup();
    vi.mocked(loadWordsForLangPair).mockResolvedValue([card]);
    const completeStudySession = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockImplementation(async (command) => ({
        sessionId: command.sessionId,
        completedAt: command.completedAt,
        localStudyDate: command.completedAt.slice(0, 10),
        cardsReviewed: 1,
        durationSeconds: 1,
        accuracy: 100,
        reviewXp: 10,
        achievementXp: 0,
        totalXpAwarded: 10,
        profile: await createTestServices().profileRepo.getProfile("test-user"),
        goals: [],
        totals: { cardsReviewed: 1, sessionsCompleted: 1, minutesStudied: 0, perfectSessions: 1 },
        unlockedAchievements: [],
        replayed: false,
      }));
    const base = createTestServices();
    renderStudy({ ...base, studyRepo: { ...base.studyRepo, completeStudySession } });

    await user.click(await screen.findByRole("button", { name: "Click to reveal answer" }));
    await user.click(screen.getByRole("button", { name: "Rate as good" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("completion could not be finalized");

    await user.click(screen.getByRole("button", { name: "Retry completion" }));
    expect(await screen.findByRole("heading", { name: "Perfect!" })).toHaveFocus();
    expect(completeStudySession.mock.calls[1]![0]).toEqual(completeStudySession.mock.calls[0]![0]);
  });

  it("uses a synchronous guard so a double rating submits one review", async () => {
    const user = userEvent.setup();
    vi.mocked(loadWordsForLangPair).mockResolvedValue([card, { ...card, id: "es-0002", word: "adios" }]);
    let resolve!: (value: RecordedCardReview) => void;
    const recordCardReview = vi.fn<(command: RecordCardReviewCommand) => Promise<RecordedCardReview>>(
      () => new Promise((r) => { resolve = r; }),
    );
    const base = createTestServices();
    renderStudy({ ...base, studyRepo: { ...base.studyRepo, recordCardReview } });
    await user.click(await screen.findByRole("button", { name: "Click to reveal answer" }));
    const rate = screen.getByRole("button", { name: "Rate as good" });
    await Promise.all([user.click(rate), user.click(rate)]);
    expect(recordCardReview).toHaveBeenCalledTimes(1);
    const command = recordCardReview.mock.calls[0]![0];
    resolve({ ...command, reviewedAt: new Date().toISOString(), progress: command.nextState, replayed: false });
  });

  it("submits the first review with a server-valid elapsed time", async () => {
    const user = userEvent.setup();
    const recordCardReview = vi.fn(async (command: RecordCardReviewCommand): Promise<RecordedCardReview> => ({
      ...command, reviewedAt: new Date().toISOString(), progress: command.nextState, replayed: false,
    }));
    const base = createTestServices();
    vi.mocked(loadWordsForLangPair).mockResolvedValue([card, { ...card, id: "es-0002", word: "adios" }]);
    renderStudy({ ...base, studyRepo: { ...base.studyRepo, recordCardReview } });

    await user.click(await screen.findByRole("button", { name: "Click to reveal answer" }));
    await user.click(screen.getByRole("button", { name: "Rate as good" }));

    await waitFor(() => expect(recordCardReview).toHaveBeenCalledTimes(1));
    expect(recordCardReview.mock.calls[0]![0].elapsedMs).toBeGreaterThanOrEqual(250);
    expect(recordCardReview.mock.calls[0]![0].elapsedMs).toBeLessThanOrEqual(300_000);
  });

  it("hides the inactive flashcard face from the accessibility tree", async () => {
    const user = userEvent.setup();
    vi.mocked(loadWordsForLangPair).mockResolvedValue([card]);
    const { container } = renderStudy();

    await screen.findByRole("button", { name: "Click to reveal answer" });
    expect(container.querySelector(".flashcard-front")).toHaveAttribute("aria-hidden", "false");
    expect(container.querySelector(".flashcard-back")).toHaveAttribute("aria-hidden", "true");

    await user.click(screen.getByRole("button", { name: "Click to reveal answer" }));
    expect(container.querySelector(".flashcard-front")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector(".flashcard-back")).toHaveAttribute("aria-hidden", "false");
  });

  it("ignores a late speech result after advancing to another card", async () => {
    const user = userEvent.setup();
    const speech = deferred<string>();
    speechMocks.isSupported.mockReturnValue(true);
    speechMocks.recognize.mockReturnValue(speech.promise);
    vi.mocked(loadWordsForLangPair).mockResolvedValue([card, { ...card, id: "es-0002", word: "adios" }]);
    renderStudy();

    await user.click(await screen.findByRole("button", { name: "Click to reveal answer" }));
    await user.click(screen.getByRole("button", { name: "Practice saying this word" }));
    await user.click(screen.getByRole("button", { name: "Rate as good" }));
    await waitFor(() => expect(screen.getByText("2 / 2")).toBeInTheDocument());
    speech.resolve("hola");

    await waitFor(() => expect(speechMocks.recognize).toHaveBeenCalledTimes(1));
    expect(screen.queryByLabelText("Good match")).not.toBeInTheDocument();
  });

  it("ignores a deferred review response after the route language changes", async () => {
    const user = userEvent.setup();
    const pendingReview = deferred<RecordedCardReview>();
    const recordCardReview = vi.fn<(command: RecordCardReviewCommand) => Promise<RecordedCardReview>>(
      () => pendingReview.promise,
    );
    const completeStudySession = vi.fn();
    const base = createTestServices();
    const zhCard = { ...card, id: "zh-0001", langPair: "en-zh" as const, word: "你好" };
    vi.mocked(loadWordsForLangPair).mockResolvedValueOnce([card]).mockResolvedValueOnce([zhCard]);
    const { rerender } = renderApp(
      <StudySession dashboardData={dashboardData} langPair="en-es" sessionTitle="Spanish" />,
      { services: { ...base, studyRepo: { recordCardReview, completeStudySession } } },
    );
    await user.click(await screen.findByRole("button", { name: "Click to reveal answer" }));
    await user.click(screen.getByRole("button", { name: "Rate as good" }));
    const oldCommand = recordCardReview.mock.calls[0]![0];

    rerender(<StudySession dashboardData={dashboardData} langPair="en-zh" sessionTitle="Mandarin" />);
    await screen.findByText("Mandarin");
    pendingReview.resolve({
      ...oldCommand,
      reviewedAt: new Date().toISOString(),
      progress: oldCommand.nextState,
      replayed: false,
    });

    await waitFor(() => expect(screen.getByText("1 / 1")).toBeInTheDocument());
    expect(screen.getAllByText("你好")).toHaveLength(2);
    expect(completeStudySession).not.toHaveBeenCalled();
  });

  it("ignores a deferred completion response after the route language changes", async () => {
    const user = userEvent.setup();
    const pendingCompletion = deferred<StudyCompletionResult>();
    const completeStudySession = vi.fn(() => pendingCompletion.promise);
    const patchSnapshot = vi.fn();
    const refresh = vi.fn(async () => {});
    const base = createTestServices();
    const zhCard = { ...card, id: "zh-0001", langPair: "en-zh" as const, word: "你好" };
    vi.mocked(loadWordsForLangPair).mockResolvedValueOnce([card]).mockResolvedValueOnce([zhCard]);
    const { rerender } = renderApp(
      <StudySession dashboardData={dashboardData} langPair="en-es" sessionTitle="Spanish" />,
      { services: { ...base, patchSnapshot, refresh, studyRepo: { ...base.studyRepo, completeStudySession } } },
    );
    await user.click(await screen.findByRole("button", { name: "Click to reveal answer" }));
    await user.click(screen.getByRole("button", { name: "Rate as good" }));
    await waitFor(() => expect(completeStudySession).toHaveBeenCalledTimes(1));

    rerender(<StudySession dashboardData={dashboardData} langPair="en-zh" sessionTitle="Mandarin" />);
    await screen.findByText("Mandarin");
    pendingCompletion.resolve({
      sessionId: "old-session",
      completedAt: new Date().toISOString(),
      localStudyDate: "2026-07-26",
      cardsReviewed: 1,
      durationSeconds: 1,
      accuracy: 100,
      reviewXp: 10,
      achievementXp: 0,
      totalXpAwarded: 10,
      profile: await base.profileRepo.getProfile(base.userId),
      goals: [],
      totals: { cardsReviewed: 1, sessionsCompleted: 1, minutesStudied: 0, perfectSessions: 1 },
      unlockedAchievements: [],
      replayed: false,
    });

    await waitFor(() => expect(screen.queryByRole("heading", { name: "Perfect!" })).not.toBeInTheDocument());
    expect(screen.getAllByText("你好")).toHaveLength(2);
    expect(patchSnapshot).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});
