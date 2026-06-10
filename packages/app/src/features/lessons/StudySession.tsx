import { useEffect, useRef, useState } from "react";
import { navigate } from "../../lib/router";
import type { DashboardData } from "../../data/account/repository";
import { loadWordsForLessonId, type WordEntry } from "../../lib/wordData";
import { useToast } from "../shared/Toast";
import { Breadcrumb } from "../shared/Breadcrumb";

interface StudySessionProps {
  dashboardData: DashboardData;
  lessonId: string;
}

type Rating = "again" | "hard" | "good" | "easy";

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
  lessonTitle,
  xpReward,
  onRestart,
  onBack,
}: {
  results: SessionResult[];
  lessonTitle: string;
  xpReward: number;
  onRestart: () => void;
  onBack: () => void;
}) {
  const total    = results.length;
  const correct  = results.filter((r) => r.rating === "good" || r.rating === "easy").length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const earnedXp = Math.round(xpReward * (accuracy / 100));

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
          You finished <strong>{lessonTitle}</strong>
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
          ← Back to Lesson
        </button>
        <button onClick={onRestart} style={{ background: "var(--accent)" }}>
          Study Again
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StudySession({ dashboardData, lessonId }: StudySessionProps) {
  const lesson = dashboardData.lessons.find((l) => l.lessonId === lessonId);
  const { showXp, showSuccess } = useToast();

  const [cards, setCards]           = useState<SessionCard[]>([]);
  const [cardIndex, setCardIndex]   = useState(0);
  const [isFlipped, setIsFlipped]   = useState(false);
  const [isLoading, setIsLoading]   = useState(true);
  const [results, setResults]       = useState<SessionResult[]>([]);
  const [isDone, setIsDone]         = useState(false);
  const [sessionKey, setSessionKey] = useState(0);

  useEffect(() => {
    if (!lesson) return;
    setIsLoading(true);
    loadWordsForLessonId(lessonId, lesson.difficulty, 20)
      .then((words) => {
        setCards(words.map((w, i) => ({ ...w, cardKey: `${w.id}-${i}` })));
        setIsLoading(false);
      })
      .catch(() => {
        const fallback: SessionCard[] = Array.from({ length: 15 }, (_, i) => ({
          id: `fb-${i}`, langPair: "en-es", word: `Palabra ${i + 1}`, translation: `Word ${i + 1}`,
          partOfSpeech: "noun", exampleSentence: `Ejemplo ${i + 1}.`, exampleTranslation: `Example ${i + 1}.`,
          audio: "", cardKey: `fb-${i}`,
        }));
        setCards(fallback);
        setIsLoading(false);
      });
  }, [lessonId, lesson, sessionKey]);

  const currentCard = cards[cardIndex];
  const totalCards  = cards.length;
  const progress    = totalCards > 0 ? (cardIndex / totalCards) * 100 : 0;

  const handleRating = (rating: Rating) => {
    if (!currentCard) return;
    const newResults = [...results, { cardId: currentCard.id, word: currentCard.word, rating }];
    setResults(newResults);
    if (cardIndex >= totalCards - 1) {
      const correct = newResults.filter((r) => r.rating === "good" || r.rating === "easy").length;
      const accuracy = Math.round((correct / newResults.length) * 100);
      const earnedXp = Math.round((lesson?.xpReward ?? 100) * (accuracy / 100));
      showXp(earnedXp, `${lesson?.title ?? "Lesson"} complete`);
      if (accuracy === 100) showSuccess("Perfect score!", "You aced every card 🎉");
      setIsDone(true);
    } else {
      setCardIndex((i) => i + 1);
      setIsFlipped(false);
    }
  };

  const stateRef = useRef({ isFlipped, isDone, isLoading });
  stateRef.current = { isFlipped, isDone, isLoading };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { isFlipped, isDone, isLoading } = stateRef.current;
      if (isDone || isLoading) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case " ": case "Enter": e.preventDefault(); setIsFlipped((f) => !f); break;
        case "1": if (isFlipped) { e.preventDefault(); handleRating("again"); } break;
        case "2": if (isFlipped) { e.preventDefault(); handleRating("hard"); } break;
        case "3": if (isFlipped) { e.preventDefault(); handleRating("good"); } break;
        case "4": if (isFlipped) { e.preventDefault(); handleRating("easy"); } break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestart = () => {
    setCardIndex(0); setIsFlipped(false); setResults([]); setIsDone(false);
    setSessionKey((k) => k + 1);
  };

  if (!lesson) {
    return (
      <section className="screen swiss page-enter">
        <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
          <h2>Lesson not found</h2>
          <button onClick={() => navigate("/lessons")} style={{ marginTop: "1rem" }}>Back to Lessons</button>
        </div>
      </section>
    );
  }

  if (isDone) {
    return (
      <SessionComplete
        results={results}
        lessonTitle={lesson.title}
        xpReward={lesson.xpReward}
        onRestart={handleRestart}
        onBack={() => navigate("/lessons/:lessonId", { lessonId })}
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
          onClick={() => navigate("/lessons/:lessonId", { lessonId })}
          style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "0.25rem 0", fontSize: "0.9rem", fontWeight: 600, textTransform: "none", letterSpacing: 0, minWidth: "auto" }}
        >
          ✕ Exit
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <Breadcrumb currentPath="/lessons/:lessonId/study" params={{ lessonId }} labels={{ lessonTitle: lesson.title }} />
          <div style={{ fontSize: "0.9rem", fontWeight: 700, marginTop: "-0.25rem" }}>{lesson.title}</div>
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
