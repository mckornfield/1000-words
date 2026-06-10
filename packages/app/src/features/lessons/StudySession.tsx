import { useState } from "react";
import type { CSSProperties } from "react";
import { navigate } from "../../lib/router";
import type { DashboardData } from "../../data/account/repository";

interface StudySessionProps {
  dashboardData: DashboardData;
  lessonId: string;
}

interface Card {
  id: string;
  spanish: string;
  english: string;
  example: string;
}

export function StudySession({ dashboardData, lessonId }: StudySessionProps) {
  const lesson = dashboardData.lessons.find((l) => l.lessonId === lessonId);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    cardsReviewed: 0,
    correct: 0,
    incorrect: 0,
  });

  // Mock cards for the lesson
  const mockCards: Card[] = Array.from({ length: 20 }, (_, i) => ({
    id: `card-${i}`,
    spanish: `Palabra ${i + 1}`,
    english: `Translation ${i + 1}`,
    example: `Example sentence ${i + 1}...`,
  }));

  const currentCard = mockCards[cardIndex];
  const progress = Math.round(((cardIndex + 1) / mockCards.length) * 100);
  const isLastCard = cardIndex === mockCards.length - 1;

  if (!currentCard) {
    return (
      <section className="screen swiss">
        <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
          <h2>Session ended</h2>
          <button onClick={() => navigate("/lessons/:lessonId", { lessonId })} style={{ marginTop: "1rem" }}>
            Back to Lesson
          </button>
        </div>
      </section>
    );
  }

  const handleRating = (rating: "again" | "hard" | "good" | "easy") => {
    // Track stats
    if (rating === "easy" || rating === "good") {
      setSessionStats((prev) => ({
        ...prev,
        cardsReviewed: prev.cardsReviewed + 1,
        correct: prev.correct + 1,
      }));
    } else {
      setSessionStats((prev) => ({
        ...prev,
        cardsReviewed: prev.cardsReviewed + 1,
        incorrect: prev.incorrect + 1,
      }));
    }

    // Move to next card or finish session
    if (isLastCard) {
      // Session complete
      setTimeout(() => {
        navigate("/lessons/:lessonId", { lessonId });
      }, 500);
    } else {
      setCardIndex(cardIndex + 1);
      setIsFlipped(false);
    }
  };

  if (!lesson) {
    return (
      <section className="screen swiss">
        <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
          <h2>Lesson not found</h2>
          <button onClick={() => navigate("/lessons")} style={{ marginTop: "1rem" }}>
            Back to Lessons
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="screen study-session-screen" style={{ background: "linear-gradient(135deg, #f2efe9, #faf8f5)" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "1rem", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
            paddingBottom: "1rem",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <button
            onClick={() => navigate("/lessons/:lessonId", { lessonId })}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: "1rem",
              color: "var(--text-secondary)",
              padding: 0,
            }}
          >
            ← Exit
          </button>
          <h1 style={{ margin: 0, fontSize: "1.2rem" }}>{lesson.title}</h1>
          <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            {cardIndex + 1} / {mockCards.length}
          </div>
        </header>

        {/* Progress Bar */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ height: "6px", background: "var(--border)", borderRadius: "3px", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: "var(--accent)",
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Progress: {progress}%
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Flashcard */}
        <div
          style={{
            perspective: "1000px",
            marginBottom: "2rem",
            height: "300px",
          }}
        >
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              transition: "transform 0.6s",
              transformStyle: "preserve-3d",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              cursor: "pointer",
            } as CSSProperties}
          >
            {/* Front */}
            <div
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                backfaceVisibility: "hidden",
                background: "linear-gradient(135deg, var(--surface), var(--surface-raised))",
                border: "2px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                padding: "2rem",
                boxShadow: "var(--shadow-lg)",
                textAlign: "center",
              } as CSSProperties}
            >
              <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                Spanish
              </div>
              <div style={{ fontSize: "3rem", fontWeight: 700, marginBottom: "1rem", color: "var(--accent)" }}>
                {currentCard.spanish}
              </div>
              <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                (Click to reveal answer)
              </div>
            </div>

            {/* Back */}
            <div
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                backfaceVisibility: "hidden",
                background: "linear-gradient(135deg, var(--accent), #a93226)",
                border: "2px solid var(--accent)",
                borderRadius: "var(--radius-lg)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                padding: "2rem",
                boxShadow: "var(--shadow-lg)",
                textAlign: "center",
                color: "#fff",
                transform: "rotateY(180deg)",
              } as CSSProperties}
            >
              <div style={{ fontSize: "0.9rem", marginBottom: "1rem", opacity: 0.9 }}>
                English
              </div>
              <div style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
                {currentCard.english}
              </div>
              <div style={{ fontSize: "0.85rem", fontStyle: "italic", opacity: 0.85 }}>
                {currentCard.example}
              </div>
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Rating Buttons */}
        {isFlipped ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1rem" }}>
            <button
              onClick={() => handleRating("again")}
              style={{
                padding: "1rem",
                borderRadius: "var(--radius)",
                background: "#e74c3c",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.9rem",
              }}
            >
              Again
            </button>
            <button
              onClick={() => handleRating("hard")}
              style={{
                padding: "1rem",
                borderRadius: "var(--radius)",
                background: "#f39c12",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.9rem",
              }}
            >
              Hard
            </button>
            <button
              onClick={() => handleRating("good")}
              style={{
                padding: "1rem",
                borderRadius: "var(--radius)",
                background: "#27ae60",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.9rem",
              }}
            >
              Good
            </button>
            <button
              onClick={() => handleRating("easy")}
              style={{
                padding: "1rem",
                borderRadius: "var(--radius)",
                background: "#16a34a",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.9rem",
              }}
            >
              Easy
            </button>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "1rem", color: "var(--text-secondary)" }}>
            <p style={{ margin: 0, fontSize: "0.95rem" }}>Click the card to reveal the answer</p>
          </div>
        )}

        {/* Session Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1rem",
            marginTop: "1rem",
            padding: "1rem",
            background: "var(--surface)",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Reviewed</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{sessionStats.cardsReviewed}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--status-ok)" }}>Correct</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--status-ok)" }}>
              {sessionStats.correct}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--status-warn)" }}>Incorrect</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--status-warn)" }}>
              {sessionStats.incorrect}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

