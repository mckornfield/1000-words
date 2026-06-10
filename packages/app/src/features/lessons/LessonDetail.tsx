import type { CSSProperties } from "react";
import { navigate } from "../../lib/router";
import type { DashboardData } from "../../data/account/repository";

interface LessonDetailProps {
  dashboardData: DashboardData;
  lessonId: string;
}

export function LessonDetail({ dashboardData, lessonId }: LessonDetailProps) {
  const lesson = dashboardData.lessons.find((l) => l.lessonId === lessonId);

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

  // Mock word list - in production, this would come from the lesson data
  const mockWords = Array.from({ length: 25 }, (_, i) => ({
    word: `Palabra ${i + 1}`,
    translation: `Translation ${i + 1}`,
    difficulty: (i % 3) as 0 | 1 | 2,
  }));

  return (
    <section className="screen lesson-detail-screen swiss">
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "1rem" }}>
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
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📚</div>
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
              <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>
                {lesson.status === "completed"
                  ? "✓ Complete"
                  : lesson.status === "in_progress"
                    ? "◐ In Progress"
                    : "⊖ Locked"}
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
          <h2 style={{ marginTop: 0 }}>Words in This Lesson</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
            Total: {mockWords.length} words · {lesson.difficulty === "starter" ? "Perfect for beginners" : lesson.difficulty === "core" ? "Essential vocabulary" : "Advanced terms"}
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: 700, color: "var(--text-secondary)" }}>
                    Spanish
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: 700, color: "var(--text-secondary)" }}>
                    English
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: 700, color: "var(--text-secondary)" }}>
                    Difficulty
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockWords.slice(0, 10).map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "0.75rem" }}>{item.word}</td>
                    <td style={{ padding: "0.75rem" }}>{item.translation}</td>
                    <td style={{ padding: "0.75rem" }}>
                      <span style={{ fontSize: "0.85rem", color: item.difficulty === 0 ? "var(--status-ok)" : item.difficulty === 1 ? "var(--status-warn)" : "var(--accent)" }}>
                        {item.difficulty === 0 ? "Easy" : item.difficulty === 1 ? "Medium" : "Hard"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Showing first 10 of {mockWords.length} words. Complete the lesson to master all words.
          </p>
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

