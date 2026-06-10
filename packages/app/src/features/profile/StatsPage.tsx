import { navigate } from "../../lib/router";
import type { DashboardData } from "../../data/account/repository";

interface StatsPageProps {
  dashboardData: DashboardData;
}

export function StatsPage({ dashboardData }: StatsPageProps) {
  const { profile, lessons, achievements, activityTimeline } = dashboardData;

  const lessonCount = lessons.filter((l) => l.status === "completed").length;
  const achievementCount = achievements.filter((a) => a.status === "completed").length;

  // Mock weekly stats
  const weeklyStats = Array.from({ length: 7 }, (_, i) => ({
    day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
    xp: Math.floor(Math.random() * 500) + 100,
  }));

  return (
    <section className="screen stats-screen swiss">
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "1rem" }}>
        <header className="topbar" style={{ marginBottom: "1.5rem" }}>
          <button onClick={() => navigate("/profile")}>← Back</button>
          <h1>Stats & History</h1>
          <div />
        </header>

        {/* Lifetime Stats */}
        <div className="bento-cell" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ marginTop: 0 }}>Lifetime Statistics</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1.5rem" }}>
            <div style={{ textAlign: "center", padding: "1rem", background: "var(--surface-raised)", borderRadius: "var(--radius)" }}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--accent)" }}>
                {profile.xp.toLocaleString()}
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                Total XP
              </div>
            </div>
            <div style={{ textAlign: "center", padding: "1rem", background: "var(--surface-raised)", borderRadius: "var(--radius)" }}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--accent)" }}>
                {lessonCount}
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                Lessons Completed
              </div>
            </div>
            <div style={{ textAlign: "center", padding: "1rem", background: "var(--surface-raised)", borderRadius: "var(--radius)" }}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--accent)" }}>
                {achievementCount}
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                Achievements
              </div>
            </div>
            <div style={{ textAlign: "center", padding: "1rem", background: "var(--surface-raised)", borderRadius: "var(--radius)" }}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--accent)" }}>
                {profile.streakDays}
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                Day Streak
              </div>
            </div>
          </div>
        </div>

        {/* Weekly XP Chart */}
        <div className="bento-cell" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ marginTop: 0 }}>Weekly Activity</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
            {weeklyStats.map((stat) => {
              const maxXP = Math.max(...weeklyStats.map((s) => s.xp));
              const height = (stat.xp / maxXP) * 150;
              return (
                <div key={stat.day} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div
                    style={{
                      width: "100%",
                      height: `${height}px`,
                      background: "var(--accent)",
                      borderRadius: "var(--radius-sm)",
                      marginBottom: "0.5rem",
                      transition: "background 0.2s",
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
          <p style={{ margin: "0", fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "center" }}>
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
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    {event.detail}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                    {new Date(event.timestamp).toLocaleDateString()} at{" "}
                    {new Date(event.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Back Button */}
        <div style={{ marginTop: "2rem" }}>
          <button
            onClick={() => navigate("/profile")}
            style={{
              width: "100%",
              padding: "0.8rem 1.5rem",
              borderRadius: "var(--radius)",
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Back to Profile
          </button>
        </div>
      </div>
    </section>
  );
}
