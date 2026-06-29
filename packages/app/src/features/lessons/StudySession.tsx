import { useEffect, useRef, useState } from "react";
import { navigate } from "../../lib/router";
import type { DashboardData } from "../../data/account/repository";
import { loadWordsForLangPair, type WordEntry } from "../../lib/wordData";
import { useToast } from "../shared/Toast";
import { useAppContext } from "../../data/AppContext";
import { buildSession, scheduleReview, initialState } from "@1000words/engine";
import type { Card } from "@1000words/content";
import type { Rating } from "@1000words/engine";
import { checkAchievements } from "../../lib/achievementEngine";

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
  maxXp,
  onRestart,
  onBack,
}: {
  results: SessionResult[];
  sessionTitle: string;
  maxXp: number;
  onRestart: () => void;
  onBack: () => void;
}) {
  const total    = results.length;
  const correct  = results.filter((r) => r.rating === "good" || r.rating === "easy").length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const earnedXp = Math.round(maxXp * (accuracy / 100));

  return (
    <div className="session-complete">
      <div className="session-trophy">
        {accuracy === 100 ? "🏆" : accuracy >= 70 ? "⭐" : "📚"}
      </div>
      <div>
        <h1 style={{ margin: "0 0 0.3rem", fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
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
          <div className="session-stat-number" style={{ color: "#f59e0b" }}>+{earnedXp}</div>
          <div className="session-stat-label">XP Earned</div>
        </div>
      </div>
      <div style={{ width: "min(480px, 100%)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
        <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>
          Breakdown
        </div>
        <div style={{ maxHeight: "200px", overflowY: "auto" }}>
          {results.map((r) => (
            <div key={r.cardId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 1rem", borderBottom: "1px solid var(--border-subtle)", fontSize: "0.85rem", gap: "0.5rem" }}>
              <span style={{ fontWeight: 600 }}>{r.word}</span>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.15em 0.5em", borderRadius: "999px",
                background: r.rating === "easy" ? "rgba(2,132,199,0.12)" : r.rating === "good" ? "rgba(22,163,74,0.12)" : r.rating === "hard" ? "rgba(234,88,12,0.12)" : "rgba(220,38,38,0.12)",
                color: r.rating === "easy" ? "#0284c7" : r.rating === "good" ? "#16a34a" : r.rating === "hard" ? "#ea580c" : "#dc2626",
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

export function StudySession({ dashboardData, langPair, sessionTitle }: StudySessionProps) {
  const { showXp, showSuccess } = useToast();
  const { userId, progressStore, profileRepo, achievementRepo, goalRepo } = useAppContext();

  const [cards, setCards]           = useState<SessionCard[]>([]);
  const [cardIndex, setCardIndex]   = useState(0);
  const [isFlipped, setIsFlipped]   = useState(false);
  const [isLoading, setIsLoading]   = useState(true);
  const [results, setResults]       = useState<SessionResult[]>([]);
  const [isDone, setIsDone]         = useState(false);
  const [sessionKey, setSessionKey] = useState(0);

  const progressRef = useRef<Record<string, import("@1000words/engine").FsrsState>>({});
  const startTimesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    setIsLoading(true);
    loadWordsForLangPair(langPair)
      .then(async (words) => {
        let progress: Record<string, import("@1000words/engine").FsrsState> = {};
        try {
          progress = await progressStore.getProgress(userId, langPair as import("@1000words/content").LangPair);
        } catch (err) {
          console.warn("[StudySession] Failed to load progress, starting fresh:", err);
        }
        progressRef.current = progress;

        const ordered = buildSession(words as unknown as Card[], progress, {
          now: new Date(),
          newCardsPerDay: 10,
          maxCards: 20,
        });
        const sessionWords = ordered.length > 0 ? ordered : words.slice(0, 20);
        setCards((sessionWords as WordEntry[]).map((w, i) => ({ ...w, cardKey: `${w.id}-${i}` })));
        setIsLoading(false);
      })
      .catch(() => {
        const fallback: SessionCard[] = Array.from({ length: 15 }, (_, i) => ({
          id: `fb-${i}`, langPair, word: `Word ${i + 1}`, translation: `Translation ${i + 1}`,
          partOfSpeech: "noun", exampleSentence: `Example ${i + 1}.`, exampleTranslation: `Example ${i + 1}.`,
          audio: "", cardKey: `fb-${i}`,
        }));
        setCards(fallback);
        setIsLoading(false);
      });
  }, [langPair, sessionKey, userId, progressStore]);

  const currentCard = cards[cardIndex];
  const totalCards  = cards.length;
  const progress    = totalCards > 0 ? (cardIndex / totalCards) * 100 : 0;
  const maxXp       = totalCards * 15;

  const handleRating = (rating: Rating) => {
    if (!currentCard) return;

    const now = new Date();
    const elapsedMs = now.getTime() - (startTimesRef.current[currentCard.id] ?? now.getTime());

    if (!currentCard.id.startsWith("fb-")) {
      const currentState = progressRef.current[currentCard.id] ?? initialState(now);
      const nextState = scheduleReview(currentState, rating, now);
      progressRef.current = { ...progressRef.current, [currentCard.id]: nextState };
      progressStore.upsertProgress(userId, currentCard.id, nextState).catch(console.error);
      progressStore.logReview(userId, currentCard.id, rating, elapsedMs).catch(console.error);
    }

    const newResults = [...results, { cardId: currentCard.id, word: currentCard.word, rating }];
    setResults(newResults);

    if (cardIndex >= totalCards - 1) {
      const correct = newResults.filter((r) => r.rating === "good" || r.rating === "easy").length;
      const accuracy = Math.round((correct / newResults.length) * 100);
      const earnedXp = Math.round(maxXp * (accuracy / 100));

      if (earnedXp > 0) {
        profileRepo.addXp(userId, earnedXp).catch(console.error);
      }
      goalRepo.incrementGoal(userId, "cards_reviewed", newResults.length).catch(console.error);

      (async () => {
        try {
          const [userAchievements, profile] = await Promise.all([
            achievementRepo.getUserAchievements(userId),
            profileRepo.getProfile(userId),
          ]);
          const earned = new Set(userAchievements.map((a) => a.achievementId));
          const lessonsCompleted = dashboardData.lessons.filter((l) => l.status === "completed").length;
          const newlyUnlocked = checkAchievements(
            dashboardData.achievements,
            earned,
            {
              cardsReviewed: newResults.length,
              accuracy,
              xpEarned: earnedXp,
              hour: new Date().getHours(),
              streakCount: profile.streakCount,
              totalCardsReviewedAllTime: newResults.length,
              lessonsCompleted,
            },
          );
          for (const achId of newlyUnlocked) {
            await achievementRepo.unlock(userId, achId);
            const ach = dashboardData.achievements.find((a) => a.achievementId === achId);
            if (ach) showSuccess(`Achievement unlocked: ${ach.title}`, ach.description);
          }
        } catch (err) {
          console.error("[StudySession] Achievement check failed:", err);
        }
      })();

      showXp(earnedXp, `${sessionTitle} session complete`);
      if (accuracy === 100) showSuccess("Perfect score!", "You aced every card 🎉");
      setIsDone(true);
    } else {
      const nextCard = cards[cardIndex + 1];
      if (nextCard) startTimesRef.current[nextCard.id] = Date.now();
      setCardIndex((i) => i + 1);
      setIsFlipped(false);
    }
  };

  const stateRef = useRef({ isFlipped, isDone, isLoading });
  stateRef.current = { isFlipped, isDone, isLoading };

  const handleRatingRef = useRef(handleRating);
  handleRatingRef.current = handleRating;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { isFlipped, isDone, isLoading } = stateRef.current;
      if (isDone || isLoading) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
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

  if (isDone) {
    return (
      <SessionComplete
        results={results}
        sessionTitle={sessionTitle}
        maxXp={maxXp}
        onRestart={handleRestart}
        onBack={() => navigate("/dashboard")}
      />
    );
  }

  if (isLoading || !currentCard) {
    return (
      <div className="study-screen page-enter" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "var(--muted)", fontSize: "1rem" }}>
          <span style={{ animation: "rotateFull 1s linear infinite", display: "inline-block" }}>⟳</span>
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
        <div style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: "0.9rem" }}>
          {sessionTitle}
        </div>
        <div style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: 600, fontVariantNumeric: "tabular-nums", minWidth: "3.5rem", textAlign: "right" }}>
          {cardIndex + 1} / {totalCards}
        </div>
      </div>

      <div className="study-progress-bar">
        <div className="study-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="study-card-area">
        <div
          className="flashcard-wrapper"
          onClick={() => setIsFlipped((f) => !f)}
          role="button"
          tabIndex={0}
          aria-label={isFlipped ? "Showing answer — click to flip back" : "Click to reveal answer"}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsFlipped((f) => !f); } }}
        >
          <div className={`flashcard${isFlipped ? " flipped" : ""}`}>
            <div className="flashcard-face flashcard-front">
              <span className="flashcard-pos">{currentCard.partOfSpeech}</span>
              <div className="flashcard-word">{currentCard.word}</div>
              <div className="flashcard-hint">Tap to reveal · <span className="kbd">Space</span></div>
            </div>
            <div className="flashcard-face flashcard-back">
              <span className="flashcard-pos">{currentCard.partOfSpeech}</span>
              <div className="flashcard-word" style={{ color: "var(--accent)" }}>{currentCard.word}</div>
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

        {isFlipped ? (
          <div className="study-rating-row" role="group" aria-label="Rate this card">
            {(["again", "hard", "good", "easy"] as Rating[]).map((r, i) => (
              <button key={r} className={`rating-btn rating-${r}`} onClick={() => handleRating(r)} aria-label={`Rate as ${r}`}>
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
