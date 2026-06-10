import { useState } from "react";
import type { CSSProperties } from "react";
import { navigate } from "../../lib/router";
import type { DashboardData, Lesson } from "../../data/account/repository";

interface LessonsListProps {
  dashboardData: DashboardData;
  onNavigateToLesson: (lessonId: string) => void;
}

type DifficultyFilter = "all" | "starter" | "core" | "advanced";
type StatusFilter = "all" | "completed" | "in_progress" | "locked";

export function LessonsList({ dashboardData }: LessonsListProps) {
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Group lessons by trackId
  const lessonsByTrack = dashboardData.lessons.reduce((acc, lesson) => {
    const trackId = lesson.trackId as keyof typeof acc;
    if (!acc[trackId]) {
      acc[trackId] = [];
    }
    acc[trackId]!.push(lesson);
    return acc;
  }, {} as Record<string, Lesson[]>);

  // Filter lessons
  const filteredLessons = Object.entries(lessonsByTrack).map(([trackId, lessons]) => {
    const filtered = lessons.filter((lesson) => {
      const matchesDifficulty = difficultyFilter === "all" || lesson.difficulty === difficultyFilter;
      const matchesStatus = statusFilter === "all" || lesson.status === statusFilter;
      const matchesSearch =
        searchTerm === "" ||
        lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lesson.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesDifficulty && matchesStatus && matchesSearch;
    });
    return { trackId, lessons: filtered };
  });

  return (
    <section className="screen lessons-screen swiss">
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1rem" }}>
        <header className="topbar" style={{ marginBottom: "1.5rem" }}>
          <button onClick={() => navigate("/dashboard")}>← Back</button>
          <h1>Lessons</h1>
          <div />
        </header>

        {/* Filter & Search */}
        <div className="bento-cell" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                Search
              </label>
              <input
                type="text"
                placeholder="Search lessons..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.7rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                Difficulty
              </label>
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value as DifficultyFilter)}
                style={{
                  width: "100%",
                  padding: "0.7rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
                }}
              >
                <option value="all">All Levels</option>
                <option value="starter">Starter</option>
                <option value="core">Core</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                style={{
                  width: "100%",
                  padding: "0.7rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
                }}
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="in_progress">In Progress</option>
                <option value="locked">Locked</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lessons by Track */}
        {filteredLessons.map(({ trackId, lessons }) => (
          lessons.length > 0 && (
            <div key={trackId} style={{ marginBottom: "2rem" }}>
              <h2 style={{ marginBottom: "1rem", color: "var(--text-secondary)", fontSize: "0.95rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {trackId.replace("Trk-", "").replace("-ES", " Spanish").replace("-ZH", " Mandarin")}
              </h2>
              <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                {lessons.map((lesson) => {
                  const statusColor =
                    lesson.status === "completed"
                      ? "var(--status-ok-bg)"
                      : lesson.status === "in_progress"
                        ? "var(--status-warn-bg)"
                        : "var(--status-muted-bg)";
                  return (
                    <div
                      key={lesson.lessonId}
                      className="bento-cell"
                      onClick={() => navigate("/lessons/:lessonId", { lessonId: lesson.lessonId })}
                      style={{
                        cursor: "pointer",
                        background: statusColor,
                        transition: "transform var(--t-base), box-shadow var(--t-base)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.75rem" }}>
                        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{lesson.title}</h3>
                        <span
                          style={{
                            padding: "0.4rem 0.75rem",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            background:
                              lesson.status === "completed"
                                ? "var(--status-ok)"
                                : lesson.status === "in_progress"
                                  ? "var(--status-warn)"
                                  : "var(--status-muted)",
                            color: "#fff",
                          }}
                        >
                          {lesson.status === "completed" ? "Complete" : lesson.status === "in_progress" ? "In Progress" : "Locked"}
                        </span>
                      </div>
                      <p style={{ margin: "0 0 1rem 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                        {lesson.description}
                      </p>
                      <div style={{ display: "grid", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Difficulty:</span>
                          <strong>{lesson.difficulty.charAt(0).toUpperCase() + lesson.difficulty.slice(1)}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Estimated:</span>
                          <strong>{lesson.estimatedMinutes} min</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Reward:</span>
                          <strong>{lesson.xpReward} XP</strong>
                        </div>
                      </div>
                      <div
                        style={{
                          marginTop: "1rem",
                          height: "6px",
                          background: "rgba(0, 0, 0, 0.1)",
                          borderRadius: "3px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${lesson.completionPercent}%`,
                            background: "var(--accent)",
                            transition: "width var(--t-base)",
                          }}
                        />
                      </div>
                      <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--text-secondary)", textAlign: "right" }}>
                        {lesson.completionPercent}% complete
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ))}

        {filteredLessons.every(({ lessons }) => lessons.length === 0) && (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
            <p>No lessons match your filters.</p>
          </div>
        )}
      </div>
    </section>
  );
}

