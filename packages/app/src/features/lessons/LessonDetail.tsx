import { useEffect, useState } from "react";
import { navigate } from "../../lib/router";
import type { DashboardData } from "../../data/account/repository";
import { loadWordsForLessonId, type WordEntry } from "../../lib/wordData";
import { Breadcrumb } from "../shared/Breadcrumb";
import { BookIcon, HalfProgressIcon, LockedIcon } from "../shared/icons";

interface LessonDetailProps {
  dashboardData: DashboardData;
  lessonId: string;
}

export function LessonDetail({ dashboardData, lessonId }: LessonDetailProps) {
  const lesson = dashboardData.lessons.find((l) => l.lessonId === lessonId);
  const [words, setWords] = useState<WordEntry[]>([]);
  const [showAllWords, setShowAllWords] = useState(false);

  useEffect(() => {
    if (!lesson) return;
    loadWordsForLessonId(lessonId, lesson.difficulty, 25)
      .then(setWords)
      .catch(() => setWords([]));
  }, [lessonId, lesson]);

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

  const statusColor =
    lesson.status === "completed"
      ? "var(--status-ok)"
      : lesson.status === "in_progress"
        ? "var(--status-warn)"
        : "var(--status-muted)";

  const visibleWords = showAllWords ? words : words.slice(0, 10);
  const difficultyLabel = lesson.difficulty === "starter" ? "Perfect for beginners" : lesson.difficulty === "core" ? "Essential vocabulary" : "Advanced terms";

  return (
    <section className="screen lesson-detail-screen swiss page-enter">
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "1rem" }}>
        <Breadcrumb currentPath="/lessons/:lessonId" params={{ lessonId }} labels={{ lessonTitle: lesson.title }} />
        <header className="topbar" style={{ marginBottom: "1.5rem" }}>
          <button onClick={() => navigate("/lessons")}>← Back</button>
          <h1>{lesson.title}</h1>
          <div />
        </header>

        {/* Hero Section */}
        <div className="bento-cell" style={{ marginBottom: "1.5rem", background: `linear-gradient(135deg, ${statusColor}, rgba(192, 57, 43, 0.1))` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "center" }}>
            <div>
              <h1 style={{ margin: "0 0 0.5rem 0", fontSize: "2rem" }}>{lesson.title}</h1>
              <p style={{ margin: "0 0 1rem 0", color: "var(--text-secondary)", fontSize: "1.1rem" }}>
                {lesson.description}
              </p>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1rem" }}>
                <span style={{ padding: "0.5rem 1rem", borderRadius: "var(--radius-sm)", background: "rgba(0, 0, 0, 0.1)", fontSize: "0.9rem", fontWeight: 600 }}>
                  {lesson.difficulty.charAt(0).toUpperCase() + lesson.difficulty.slice(1)}
                </span>
                <span style={{ padding: "0.5rem 1rem", borderRadius: "var(--radius-sm)", background: "rgba(0, 0, 0, 0.1)", fontSize: "0.9rem", fontWeight: 600 }}>
                  {lesson.estimatedMinutes} min
                </span>
                <span style={{ padding: "0.5rem 1rem", borderRadius: "var(--radius-sm)", background: "var(--accent)", color: "#fff", fontSize: "0.9rem", fontWeight: 600 }}>
                  +{lesson.xpReward} XP
                </span>
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ marginBottom: "1rem" }}><BookIcon size="4rem" /></div>
              <button
                onClick={() => navigate("/lessons/:lessonId/study", { lessonId })}
                style={{
                  padding: "1rem 2rem",
                  borderRadius: "var(--radius)",
                  background: "var(--accent)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  width: "100%",
                }}
              >
                Start Review
              </button>
              {lesson.status === "locked" && (
                <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                  Complete previous lessons to unlock this one.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="bento-cell" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ marginTop: 0 }}>Your Progress</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                Completion
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--accent)" }}>
                {lesson.completionPercent}%
              </div>
              <div
                style={{
                  marginTop: "0.5rem",
                  height: "8px",
                  background: "rgba(0, 0, 0, 0.1)",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${lesson.completionPercent}%`,
                    background: "var(--accent)",
                  }}
                />
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                Status
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.35em" }}>
                {lesson.status === "completed"
                  ? "✓ Complete"
                  : lesson.status === "in_progress"
                    ? <><HalfProgressIcon /> In Progress</>
                    : <><LockedIcon /> Locked</>}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                Time Est.
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 700 }}>
                {lesson.estimatedMinutes}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>minutes</div>
            </div>
          </div>
        </div>

        {/* Word List Section */}
        <div className="bento-cell" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.75rem" }}>
            <h2 style={{ marginTop: 0, marginBottom: 0 }}>Words in This Lesson</h2>
            {words.length > 0 && (
              <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                {words.length} words · {difficultyLabel}
              </span>
            )}
          </div>
          {words.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)", fontSize: "0.9rem" }}>
              Loading vocabulary…
            </div>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border)" }}>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "left", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>Spanish</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "left", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>English</th>
                      <th style={{ padding: "0.6rem 0.75rem", textAlign: "left", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>Part of Speech</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleWords.map((item) => (
                      <tr key={item.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "0.65rem 0.75rem", fontWeight: 600 }}>{item.word}</td>
                        <td style={{ padding: "0.65rem 0.75rem", color: "var(--text-secondary)" }}>{item.translation}</td>
                        <td style={{ padding: "0.65rem 0.75rem" }}>
                          <span style={{ fontSize: "0.72rem", color: "var(--muted)", background: "var(--surface-raised)", border: "1px solid var(--border-subtle)", borderRadius: "999px", padding: "0.15em 0.55em", fontWeight: 600 }}>
                            {item.partOfSpeech}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {words.length > 10 && (
                <button
                  onClick={() => setShowAllWords((v) => !v)}
                  style={{ marginTop: "0.75rem", background: "none", color: "var(--text-secondary)", border: "1px solid var(--border)", fontSize: "0.8rem", padding: "0.4rem 0.9rem", textTransform: "none", letterSpacing: 0, fontWeight: 600 }}
                >
                  {showAllWords ? "Show fewer words" : `Show all ${words.length} words`}
                </button>
              )}
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
          <button
            onClick={() => navigate("/lessons/:lessonId/study", { lessonId })}
            style={{
              padding: "0.8rem 1.5rem",
              borderRadius: "var(--radius)",
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Start Review
          </button>
          <button
            onClick={() => navigate("/lessons")}
            style={{
              padding: "0.8rem 1.5rem",
              borderRadius: "var(--radius)",
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Back to Lessons
          </button>
        </div>
      </div>
    </section>
  );
}

