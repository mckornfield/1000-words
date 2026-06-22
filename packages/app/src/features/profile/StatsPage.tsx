import { useEffect, useState } from "react";
import { navigate } from "../../lib/router";
import { Breadcrumb } from "../shared/Breadcrumb";
import type { DashboardData } from "../../data/account/repository";
import { useAppContext } from "../../data/AppContext";
import type { DailyXp } from "../../data/types";

interface StatsPageProps {
  dashboardData: DashboardData;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  const idx = d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1;
  return DAY_LABELS[idx] ?? isoDate.slice(5);
}

export function StatsPage({ dashboardData }: StatsPageProps) {
  const { profile, lessons, achievements, activityTimeline } = dashboardData;
  const { statsRepo, userId } = useAppContext();

  const lessonCount = lessons.filter((l) => l.status === "completed").length;
  const achievementCount = achievements.filter((a) => a.status === "completed").length;

  const [weeklyStats, setWeeklyStats] = useState<Array<{ day: string; xp: number }>>([]);

  useEffect(() => {
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    statsRepo
      .getWeeklyXp(userId, since)
      .then((data: DailyXp[]) =>
        setWeeklyStats(data.map((d) => ({ day: dayLabel(d.date), xp: d.xp }))),
      )
      .catch(() =>
        // Fallback to zeros on error rather than showing nothing.
        setWeeklyStats(DAY_LABELS.map((day) => ({ day, xp: 0 }))),
      );
  }, [userId, statsRepo]);

  return (
    <section className="screen stats-screen swiss page-enter">
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "1rem" }}>
        <Breadcrumb currentPath="/profile/stats" />
        <header className="topbar" style={{ marginBottom: "1.5rem" }}>
          <button onClick={() => navigate("/profile")}>← Back</button>
          <h1>Stats & History</h1>
          <div />
        </header>

        {/* Lifetime Stats */}
        <div className="bento-cell" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ marginTop: 0 }}>Lifetime Statistics</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1.5rem" }}>
            {[
              { label: "Total XP",           value: profile.xp.toLocaleString() },
              { label: "Lessons Completed",   value: lessonCount },
              { label: "Achievements",        value: achievementCount },
              { label: "Day Streak",          value: profile.streakDays },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: "center", padding: "1rem", background: "var(--surface-raised)", borderRadius: "var(--radius)" }}>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--accent)" }}>{value}</div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly XP Chart */}
        <div className="bento-cell" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ marginTop: 0 }}>Weekly Activity</h2>
          {weeklyStats.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
              {weeklyStats.map((stat) => {
                const maxXP = Math.max(...weeklyStats.map((s) => s.xp), 1);
                const height = Math.max((stat.xp / maxXP) * 150, 4);
                return (
                  <div key={stat.day} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div
                      style={{
                        width: "100%",
                        height: `${height}px`,
                        background: stat.xp > 0 ? "var(--accent)" : "var(--border)",
                        borderRadius: "var(--radius-sm)",
                        marginBottom: "0.5rem",
                        transition: "height 0.3s ease",
                      }}
                      title={`${stat.xp} XP`}
                    />
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      {stat.day}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ height: "150px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: "0.9rem" }}>
              Loading activity…
            </div>
          )}
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "center" }}>
            XP earned this week
          </p>
        </div>

        {/* Recent Activity */}
        <div className="bento-cell">
          <h2 style={{ marginTop: 0 }}>Recent Activity</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {activityTimeline.map((event, idx) => (
              <li
                key={event.eventId}
                style={{
                  padding: "1rem",
                  borderBottom: idx < activityTimeline.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  display: "flex",
                  gap: "1rem",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ fontSize: "1.5rem" }}>{event.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{event.title}</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{event.detail}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                    {new Date(event.timestamp).toLocaleDateString()} at{" "}
                    {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ marginTop: "2rem" }}>
          <button
            onClick={() => navigate("/profile")}
            style={{ width: "100%", padding: "0.8rem 1.5rem", borderRadius: "var(--radius)", background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", cursor: "pointer", fontWeight: 700 }}
          >
            Back to Profile
          </button>
        </div>
      </div>
    </section>
  );
}
