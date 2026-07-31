import { useEffect, useRef, useState } from "react";
import { navigate } from "../../lib/router";
import type { DashboardData } from "../../data/account/repository";
import { DeckLoadError, loadWordsForLangPair, audioUrl, type WordEntry } from "../../lib/wordData";
import { useToast } from "../shared/Toast";
import { useAppContext } from "../../data/AppContext";
import { buildSession, scheduleReview, initialState } from "@1000words/engine";
import { getLanguage, type Card } from "@1000words/content";
import type { Rating } from "@1000words/engine";
import { TrophyIcon, StarIcon, BookIcon, SpinnerIcon, SpeakerIcon, MicIcon } from "../shared/icons";
import { isSpeechRecognitionSupported, recognizeSpeech } from "../../lib/speechRecognition";
import { isCloseMatch } from "../../lib/pronunciationScore";
import type { CompleteStudySessionCommand, RecordCardReviewCommand, StudyCompletionResult } from "../../data/types";
import { appConfig } from "../../config/appConfig";

interface StudySessionProps {
  dashboardData: DashboardData;
  langPair: string;
  sessionTitle: string;
}

interface SessionCard extends WordEntry {
  cardKey: string;
}

interface SessionResult {
  cardId: string;
  word: string;
  rating: Rating;
}

// ─── Session complete screen ─────────────────────────────────────────────────

function SessionComplete({
  results,
  sessionTitle,
  completion,
  onRestart,
  onBack,
}: {
  results: SessionResult[];
  sessionTitle: string;
  completion: StudyCompletionResult;
  onRestart: () => void;
  onBack: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const total    = results.length;

  const accuracy = completion.accuracy;
  const earnedXp = completion.totalXpAwarded;

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="session-complete">
      <div className="session-trophy">
        {accuracy === 100 ? <TrophyIcon size="5rem" /> : accuracy >= 70 ? <StarIcon size="5rem" /> : <BookIcon size="5rem" />}
      </div>
      <div>
        <h1 ref={headingRef} tabIndex={-1} style={{ margin: "0 0 0.3rem", fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
          {accuracy === 100 ? "Perfect!" : accuracy >= 70 ? "Great work!" : "Keep going!"}
        </h1>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          {sessionTitle} session complete
        </p>
      </div>
      <div className="session-stats-grid">
        <div className="session-stat-cell">
          <div className="session-stat-number">{total}</div>
          <div className="session-stat-label">Cards</div>
        </div>
        <div className="session-stat-cell">
          <div className="session-stat-number">{accuracy}%</div>
          <div className="session-stat-label">Accuracy</div>
        </div>
        <div className="session-stat-cell">
          <div className="session-stat-number" style={{ color: "#92400e" }}>+{earnedXp}</div>
          <div className="session-stat-label">XP Earned</div>
        </div>
      </div>
      <div style={{ width: "min(480px, 100%)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
        <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>
          Breakdown
        </div>
        <div tabIndex={0} aria-label="Session card breakdown" style={{ maxHeight: "200px", overflowY: "auto" }}>
          {results.map((r) => (
            <div key={r.cardId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 1rem", borderBottom: "1px solid var(--border-subtle)", fontSize: "0.85rem", gap: "0.5rem" }}>
              <span style={{ fontWeight: 600 }}>{r.word}</span>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.15em 0.5em", borderRadius: "999px",
                background: r.rating === "easy" ? "rgba(2,132,199,0.12)" : r.rating === "good" ? "rgba(22,163,74,0.12)" : r.rating === "hard" ? "rgba(234,88,12,0.12)" : "rgba(220,38,38,0.12)",
                color: r.rating === "easy" ? "#075985" : r.rating === "good" ? "#166534" : r.rating === "hard" ? "#9a3412" : "#b91c1c",
              }}>
                {r.rating.charAt(0).toUpperCase() + r.rating.slice(1)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={onBack} style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}>
          ← Home
        </button>
        <button onClick={onRestart} style={{ background: "var(--accent)" }}>
          Study Again
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StudySession({ dashboardData: _dashboardData, langPair, sessionTitle }: StudySessionProps) {
  const { showXp, showSuccess } = useToast();
  const { userId, progressStore, studyRepo, refresh, patchSnapshot } = useAppContext();

  const [cards, setCards]           = useState<SessionCard[]>([]);
  const [cardIndex, setCardIndex]   = useState(0);
  const [isFlipped, setIsFlipped]   = useState(false);
  const [isLoading, setIsLoading]   = useState(true);
  const [results, setResults]       = useState<SessionResult[]>([]);
  const [isDone, setIsDone]         = useState(false);
  const [completion, setCompletion] = useState<StudyCompletionResult | null>(null);
  const [reviewError, setReviewError] = useState(false);
  const [completionError, setCompletionError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reverseDirection, setReverseDirection] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [loadError, setLoadError] = useState<{ source: "deck" | "progress"; error: unknown } | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const stateHeadingRef = useRef<HTMLHeadingElement>(null);

  const progressRef = useRef<Record<string, import("@1000words/engine").FsrsState>>({});
  const startTimesRef = useRef<Record<string, number>>({});
  const sessionIdRef = useRef(crypto.randomUUID());
  const sessionStartedAtRef = useRef(new Date().toISOString());
  const pendingRef = useRef(false);
  const pendingReviewRef = useRef<RecordCardReviewCommand | null>(null);
  const completionCommandRef = useRef<CompleteStudySessionCommand | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const activeCardIdRef = useRef<string | undefined>(undefined);
  const sessionGenerationRef = useRef(0);
  const sessionIdentityRef = useRef("");
  const sessionIdentity = `${langPair}:${sessionKey}`;
  if (sessionIdentityRef.current !== sessionIdentity) {
    sessionIdentityRef.current = sessionIdentity;
    sessionGenerationRef.current += 1;
  }

  const [micState, setMicState] = useState<"idle" | "listening" | "match" | "no-match" | "error">("idle");
  const micResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechSupported = useRef(isSpeechRecognitionSupported()).current;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setIsEmpty(false);
    setCards([]);
    setCardIndex(0);
    setIsFlipped(false);
    setResults([]);
    setIsDone(false);
    setCompletion(null);
    setReviewError(false);
    setCompletionError(false);
    setIsSubmitting(false);
    setReverseDirection(false);
    setMicState("idle");
    sessionIdRef.current = crypto.randomUUID();
    sessionStartedAtRef.current = new Date().toISOString();
    pendingRef.current = false;
    pendingReviewRef.current = null;
    completionCommandRef.current = null;
    progressRef.current = {};
    startTimesRef.current = {};
    if (micResetRef.current) {
      clearTimeout(micResetRef.current);
      micResetRef.current = null;
    }
    loadWordsForLangPair(langPair)
      .then(async (words) => {
        try {
          const progress = await progressStore.getProgress(userId, langPair as import("@1000words/content").LangPair);
          if (cancelled) return;
          progressRef.current = progress;

          const ordered = buildSession(words as Card[], progress, {
            now: new Date(),
            newCardsPerDay: 10,
            maxCards: 20,
          });
          if (ordered.length === 0) {
            setIsEmpty(true);
          } else {
            startTimesRef.current[ordered[0]!.id] = Date.now();
            setCards(ordered.map((w, i) => ({ ...w, cardKey: `${w.id}-${i}` })));
          }
        } catch (err) {
          if (cancelled) return;
          console.error("[StudySession] Failed to load progress:", err);
          setLoadError({ source: "progress", error: err });
        }
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error("[StudySession] Failed to load deck:", err);
        setLoadError({ source: "deck", error: err });
        setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [langPair, sessionKey, userId, progressStore]);

  useEffect(() => {
    if (loadError || isEmpty) stateHeadingRef.current?.focus();
  }, [loadError, isEmpty]);

  const currentCard = cards[cardIndex];
  activeCardIdRef.current = currentCard?.id;
  const reverseSupported = getLanguage(langPair)?.supportedDirections.includes("production") ?? false;
  const totalCards  = cards.length;
  const progress    = totalCards > 0 ? (cardIndex / totalCards) * 100 : 0;

  const playCardAudio = () => {
    if (!currentCard?.audio || !audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  };

  useEffect(() => {
    if (isFlipped) playCardAudio();
  }, [isFlipped, currentCard?.id]);

  useEffect(() => {
    setMicState("idle");
    if (micResetRef.current) clearTimeout(micResetRef.current);
  }, [currentCard?.id]);

  const handleMicPress = async () => {
    if (!currentCard || micState === "listening") return;
    const requestedCardId = currentCard.id;
    const generation = sessionGenerationRef.current;
    if (micResetRef.current) clearTimeout(micResetRef.current);
    setMicState("listening");
    try {
      const transcript = await recognizeSpeech(langPair);
      if (generation !== sessionGenerationRef.current || activeCardIdRef.current !== requestedCardId) return;
      const matched = isCloseMatch(transcript, currentCard.word);
      setMicState(matched ? "match" : "no-match");
    } catch (err) {
      if (generation !== sessionGenerationRef.current || activeCardIdRef.current !== requestedCardId) return;
      console.warn("[StudySession] Speech recognition failed:", err);
      setMicState("error");
    }
    micResetRef.current = setTimeout(() => setMicState("idle"), 2500);
  };

  const completeSession = async (generation = sessionGenerationRef.current) => {
    const command = completionCommandRef.current ?? {
      sessionId: sessionIdRef.current,
      langPair: langPair as import("@1000words/content").LangPair,
      startedAt: sessionStartedAtRef.current,
      completedAt: new Date().toISOString(),
    };
    completionCommandRef.current = command;
    setIsSubmitting(true);
    try {
      const value = await studyRepo.completeStudySession(command);
      if (generation !== sessionGenerationRef.current) return;
      setCompletion(value);
      patchSnapshot({ profile: value.profile, goals: value.goals });
      await refresh(["profile", "goals", "achievements", "stats", "leaderboard"]);
      if (generation !== sessionGenerationRef.current) return;
      showXp(value.totalXpAwarded, `${sessionTitle} session complete`);
      if (value.accuracy === 100) showSuccess("Perfect score!", "You aced every card!");
      setCompletionError(false);
      setIsDone(true);
    } catch (error) {
      if (generation !== sessionGenerationRef.current) return;
      console.error("[StudySession] Completion failed:", error);
      setCompletionError(true);
    } finally {
      if (generation === sessionGenerationRef.current) setIsSubmitting(false);
    }
  };

  const submitReview = async (command: RecordCardReviewCommand) => {
    if (pendingRef.current) return;
    const generation = sessionGenerationRef.current;
    pendingRef.current = true;
    setIsSubmitting(true);
    setReviewError(false);
    try {
      const recorded = await studyRepo.recordCardReview(command);
      if (generation !== sessionGenerationRef.current) return;
      progressRef.current = { ...progressRef.current, [command.cardId]: recorded.progress };
      pendingReviewRef.current = null;
      const newResults = [...results, { cardId: command.cardId, word: currentCard!.word, rating: command.rating }];
      setResults(newResults);
      if (cardIndex >= totalCards - 1) await completeSession(generation);
      else {
        const nextCard = cards[cardIndex + 1];
        if (nextCard) startTimesRef.current[nextCard.id] = Date.now();
        setCardIndex((i) => i + 1);
        setIsFlipped(false);
      }
    } catch (error) {
      if (generation !== sessionGenerationRef.current) return;
      console.error("[StudySession] Review failed:", error);
      setReviewError(true);
    } finally {
      if (generation === sessionGenerationRef.current) {
        pendingRef.current = false;
        setIsSubmitting(false);
      }
    }
  };

  const handleRating = (rating: Rating) => {
    if (!currentCard || pendingRef.current || pendingReviewRef.current || reviewError || completionError || isSubmitting) return;
    const now = new Date();
    const currentState = progressRef.current[currentCard.id] ?? initialState(now);
    const command: RecordCardReviewCommand = {
      reviewId: crypto.randomUUID(),
      sessionId: sessionIdRef.current,
      langPair: langPair as import("@1000words/content").LangPair,
      cardId: currentCard.id,
      rating,
      elapsedMs: Math.min(
        300_000,
        Math.max(250, now.getTime() - (startTimesRef.current[currentCard.id] ?? now.getTime())),
      ),
      nextState: scheduleReview(currentState, rating, now),
    };
    pendingReviewRef.current = command;
    void submitReview(command);
  };

  const stateRef = useRef({ isFlipped, isDone, isLoading, isSubmitting, reviewError, completionError });
  stateRef.current = { isFlipped, isDone, isLoading, isSubmitting, reviewError, completionError };

  const handleRatingRef = useRef(handleRating);
  handleRatingRef.current = handleRating;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { isFlipped, isDone, isLoading, isSubmitting, reviewError, completionError } = stateRef.current;
      if (isDone || isLoading || isSubmitting || reviewError || completionError) return;
      if (e.target instanceof Element && e.target.closest("button, input, textarea, select, a, [contenteditable='true']")) return;
      switch (e.key) {
        case "Escape": e.preventDefault(); navigate("/dashboard"); break;
        case " ": case "Enter": e.preventDefault(); setIsFlipped((f) => !f); break;
        case "1": if (isFlipped) { e.preventDefault(); handleRatingRef.current("again"); } break;
        case "2": if (isFlipped) { e.preventDefault(); handleRatingRef.current("hard"); } break;
        case "3": if (isFlipped) { e.preventDefault(); handleRatingRef.current("good"); } break;
        case "4": if (isFlipped) { e.preventDefault(); handleRatingRef.current("easy"); } break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleRestart = () => {
    setCardIndex(0); setIsFlipped(false); setResults([]); setIsDone(false);
    setSessionKey((k) => k + 1);
  };

  if (isDone && completion) {
    return (
      <SessionComplete
        results={results}
        sessionTitle={sessionTitle}
        completion={completion}
        onRestart={handleRestart}
        onBack={() => navigate("/dashboard")}
      />
    );
  }

  if (loadError) {
    const isProgress = loadError.source === "progress";
    const deckKind = loadError.error instanceof DeckLoadError ? loadError.error.kind : "network";
    const detail = isProgress
      ? "Your saved progress could not be loaded. No study data has been changed."
      : deckKind === "invalid-json" || deckKind === "invalid-schema"
        ? "The lesson file is invalid and cannot be studied safely."
        : deckKind === "unsupported-language"
          ? "This language pair is not supported."
          : "The lesson cards could not be loaded. Please check your connection and try again.";
    return (
      <div className="study-screen page-enter" style={{ alignItems: "center", justifyContent: "center", padding: "1rem" }}>
        <section role="alert" style={{ width: "min(30rem, 100%)", textAlign: "center" }}>
          <h1 ref={stateHeadingRef} tabIndex={-1}>{isProgress ? "Progress unavailable" : "Cards unavailable"}</h1>
          <p>{sessionTitle}: {detail}</p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => setSessionKey((key) => key + 1)}>Retry</button>
            <button onClick={() => navigate("/dashboard")}>Return Home</button>
          </div>
        </section>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="study-screen page-enter" style={{ alignItems: "center", justifyContent: "center", padding: "1rem" }}>
        <section style={{ width: "min(30rem, 100%)", textAlign: "center" }}>
          <h1 ref={stateHeadingRef} tabIndex={-1}>Nothing due</h1>
          <p>There are no cards scheduled for this session.</p>
          <button onClick={() => navigate("/dashboard")}>Return Home</button>
        </section>
      </div>
    );
  }

  if (isLoading || !currentCard) {
    return (
      <div className="study-screen page-enter" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "var(--muted)", fontSize: "1rem" }}>
          <span style={{ animation: "rotateFull 1s linear infinite", display: "inline-block" }}><SpinnerIcon /></span>
          Loading cards…
        </div>
      </div>
    );
  }

  return (
    <div className="study-screen page-enter">
      <div className="study-header">
        <button
          onClick={() => navigate("/dashboard")}
          style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "0.25rem 0", fontSize: "0.9rem", fontWeight: 600, textTransform: "none", letterSpacing: 0, minWidth: "auto" }}
        >
          ✕ Exit
        </button>
        {appConfig.reverseStudyEnabled && reverseSupported && (
          <button
            type="button"
            aria-pressed={reverseDirection}
            aria-label="Switch study direction"
            onClick={() => {
              setReverseDirection((value) => !value);
              setIsFlipped(false);
            }}
            style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", padding: "0.3rem 0.55rem", fontSize: "0.75rem", minWidth: "auto" }}
          >
            {reverseDirection ? "English → Target" : "Target → English"}
          </button>
        )}
        <div style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: "0.9rem" }}>
          {sessionTitle}
        </div>
        <div style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: 600, fontVariantNumeric: "tabular-nums", minWidth: "3.5rem", textAlign: "right" }}>
          {cardIndex + 1} / {totalCards}
        </div>
      </div>

      <div
        className="study-progress-bar"
        role="progressbar"
        aria-label="Study session progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <div className="study-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="study-card-area">
        <div
          className="flashcard-wrapper"
          onClick={() => { if (!isFlipped) setIsFlipped(true); }}
          role={isFlipped ? undefined : "button"}
          tabIndex={isFlipped ? undefined : 0}
          aria-label={isFlipped ? undefined : "Click to reveal answer"}
          onKeyDown={(e) => { if (!isFlipped && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setIsFlipped(true); } }}
        >
          <div className={`flashcard${isFlipped ? " flipped" : ""}`}>
            <div className="flashcard-face flashcard-front" aria-hidden={isFlipped}>
              <span className="flashcard-pos">{currentCard.partOfSpeech}</span>
              <div className="flashcard-word">{reverseDirection ? currentCard.translation : currentCard.word}</div>
              <div className="flashcard-hint">Tap to reveal · <span className="kbd">Space</span></div>
            </div>
            <div className="flashcard-face flashcard-back" aria-hidden={!isFlipped}>
              <span className="flashcard-pos">{currentCard.partOfSpeech}</span>
              <div className="flashcard-word" style={{ color: "var(--accent)" }}>
                {currentCard.word}
                {currentCard.audio && (
                  <button
                    onClick={(e) => { e.stopPropagation(); playCardAudio(); }}
                    disabled={!isFlipped}
                    tabIndex={isFlipped ? 0 : -1}
                    aria-label="Replay pronunciation"
                    style={{ background: "transparent", border: "none", color: "var(--accent)", cursor: "pointer", padding: "0 0 0 0.4em", minWidth: "auto", verticalAlign: "middle" }}
                  >
                    <SpeakerIcon size="0.7em" />
                  </button>
                )}
                {speechSupported && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMicPress(); }}
                    disabled={!isFlipped || micState === "listening"}
                    tabIndex={isFlipped ? 0 : -1}
                    aria-label="Practice saying this word"
                    style={{
                      background: "transparent", border: "none", padding: "0 0 0 0.3em", minWidth: "auto", verticalAlign: "middle",
                      color: micState === "listening" ? "var(--status-warn)" : "var(--accent)",
                      cursor: micState === "listening" ? "default" : "pointer",
                    }}
                  >
                    <MicIcon size="0.7em" />
                  </button>
                )}
                {micState === "listening" && (
                  <SpinnerIcon size="0.6em" style={{ marginLeft: "0.2em", verticalAlign: "middle", animation: "rotateFull 1s linear infinite", color: "var(--status-warn)" }} />
                )}
                {micState === "match" && (
                  <span style={{ color: "var(--status-ok)", fontSize: "0.6em", verticalAlign: "middle", marginLeft: "0.2em" }} aria-label="Good match">✓</span>
                )}
                {micState === "no-match" && (
                  <span style={{ color: "#dc2626", fontSize: "0.6em", verticalAlign: "middle", marginLeft: "0.2em" }} aria-label="Didn't match, try again">✗</span>
                )}
                {micState === "error" && (
                  <span style={{ color: "var(--status-muted)", fontSize: "0.6em", verticalAlign: "middle", marginLeft: "0.2em" }} aria-label="Couldn't access microphone or speech recognition">!</span>
                )}
              </div>
              {currentCard.pronunciation && (
                <div style={{ fontSize: "1rem", color: "var(--text-secondary)", marginBottom: "0.25rem", fontStyle: "italic" }}>
                  {currentCard.pronunciation}
                </div>
              )}
              <div className="flashcard-translation">{currentCard.translation}</div>
              {currentCard.exampleSentence && (
                <>
                  <div className="flashcard-example">{currentCard.exampleSentence}</div>
                  <div className="flashcard-example-en">{currentCard.exampleTranslation}</div>
                </>
              )}
            </div>
          </div>
        </div>

        {currentCard.audio && <audio ref={audioRef} src={audioUrl(currentCard)} preload="none" />}

        {reviewError && (
          <div role="alert" style={{ textAlign: "center", color: "var(--status-warn)" }}>
            <p style={{ margin: "0 0 0.5rem" }}>This review could not be saved. Your card has not advanced.</p>
            <button
              type="button"
              onClick={() => { if (pendingReviewRef.current) void submitReview(pendingReviewRef.current); }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Retrying…" : "Retry review"}
            </button>
          </div>
        )}

        {completionError && (
          <div role="alert" style={{ textAlign: "center", color: "var(--status-warn)" }}>
            <p style={{ margin: "0 0 0.5rem" }}>Your session results are saved, but completion could not be finalized.</p>
            <button type="button" onClick={() => void completeSession()} disabled={isSubmitting}>
              {isSubmitting ? "Retrying…" : "Retry completion"}
            </button>
          </div>
        )}

        {isFlipped && !reviewError && !completionError ? (
          <div className="study-rating-row" role="group" aria-label="Rate this card" aria-busy={isSubmitting}>
            {(["again", "hard", "good", "easy"] as Rating[]).map((r, i) => (
              <button key={r} className={`rating-btn rating-${r}`} onClick={() => handleRating(r)} aria-label={`Rate as ${r}`} disabled={isSubmitting}>
                <span>{r.charAt(0).toUpperCase() + r.slice(1)}</span>
                <span className="rating-key kbd">{i + 1}</span>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ height: "52px", display: "flex", alignItems: "center", color: "var(--muted)", fontSize: "0.8rem", gap: "0.5rem" }}>
            <span className="kbd">Space</span><span>or tap card to flip</span>
          </div>
        )}
      </div>

      <div style={{ padding: "0.75rem 1.25rem", borderTop: "1px solid var(--border)", display: "flex", gap: "1.5rem", fontSize: "0.78rem", color: "var(--muted)", justifyContent: "center", background: "var(--surface)" }}>
        <span><span style={{ color: "var(--status-ok)", fontWeight: 700 }}>{results.filter((r) => r.rating === "good" || r.rating === "easy").length}</span>{" "}correct</span>
        <span><span style={{ color: "var(--accent)", fontWeight: 700 }}>{results.filter((r) => r.rating === "again" || r.rating === "hard").length}</span>{" "}to review</span>
        <span><span style={{ fontWeight: 700, color: "var(--text-secondary)" }}>{totalCards - cardIndex - 1}</span>{" "}remaining</span>
      </div>
    </div>
  );
}
