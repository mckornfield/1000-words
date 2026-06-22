import { navigate } from "../../lib/router";
import { FallbackGlyph } from "../shared/FallbackGlyph";
import { Breadcrumb } from "../shared/Breadcrumb";
import type { DashboardData } from "../../data/account/repository";

interface AchievementDetailProps {
  dashboardData: DashboardData;
  achievementId: string;
}

export function AchievementDetail({ dashboardData, achievementId }: AchievementDetailProps) {
  const achievement = dashboardData.achievements.find((a) => a.achievementId === achievementId);

  if (!achievement) {
    return (
      <section className="screen swiss">
        <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
          <h2>Achievement not found</h2>
          <button onClick={() => navigate("/achievements")} style={{ marginTop: "1rem" }}>
            Back to Achievements
          </button>
        </div>
      </section>
    );
  }

  const rarityColors: Record<string, string> = {
    common: "#78746e",
    rare: "#3498db",
    epic: "#9b59b6",
    legendary: "#f39c12",
  };

  // Mock related achievements
  const relatedAchievements = dashboardData.achievements.filter(
    (a) => a.rarity === achievement.rarity && a.achievementId !== achievementId
  );

  return (
    <section className="screen achievement-detail-screen swiss page-enter">
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "1rem" }}>
        <Breadcrumb currentPath="/achievements/:achievementId" params={{ achievementId }} labels={{ achievementTitle: achievement.title }} />

        {/* Hero Section */}
        <div
          className="bento-cell"
          style={{
            marginBottom: "1.5rem",
            background: `linear-gradient(135deg, ${rarityColors[achievement.rarity]}, rgba(0, 0, 0, 0.1))`,
            textAlign: "center",
            padding: "2rem",
          }}
        >
          <div style={{ fontSize: "5rem", marginBottom: "1rem" }}>
            <FallbackGlyph primary={achievement.icon} fallback={achievement.icon} />
          </div>
          <h1 style={{ margin: "0 0 0.5rem 0", fontSize: "2rem", color: "#fff" }}>
            {achievement.title}
          </h1>
          <p style={{ margin: "0", color: "rgba(255, 255, 255, 0.9)" }}>
            {achievement.description}
          </p>
        </div>

        {/* Details Section */}
        <div className="bento-cell" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1.5rem" }}>
            <div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                RARITY
              </div>
              <div
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: rarityColors[achievement.rarity],
                }}
              >
                {achievement.rarity.toUpperCase()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                STATUS
              </div>
              <div
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color:
                    achievement.status === "completed"
                      ? "var(--status-ok)"
                      : achievement.status === "in_progress"
                        ? "var(--status-warn)"
                        : "var(--muted)",
                }}
              >
                {achievement.status === "completed"
                  ? "✓ Unlocked"
                  : achievement.status === "in_progress"
                    ? "◐ In Progress"
                    : "🔒 Locked"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                REWARD
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--accent)" }}>
                +{achievement.xpReward}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>XP</div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        {achievement.completedAt && (
          <div className="bento-cell" style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ marginTop: 0 }}>Unlocked</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ fontSize: "2rem" }}>🎉</div>
              <div>
                <div style={{ fontWeight: 700 }}>Achievement Unlocked!</div>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  Earned on {new Date(achievement.completedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {achievement.status === "in_progress" && (
          <div className="bento-cell" style={{ marginBottom: "1.5rem", background: "var(--status-warn-bg)" }}>
            <h2 style={{ marginTop: 0 }}>In Progress</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ fontSize: "2rem" }}>⏳</div>
              <div>
                <div style={{ fontWeight: 700 }}>Keep working on this!</div>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  You're on your way to unlocking this achievement. Keep up the great work!
                </div>
              </div>
            </div>
          </div>
        )}

        {achievement.status === "locked" && (
          <div className="bento-cell" style={{ marginBottom: "1.5rem", background: "var(--status-muted-bg)" }}>
            <h2 style={{ marginTop: 0 }}>Locked</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ fontSize: "2rem" }}>🔒</div>
              <div>
                <div style={{ fontWeight: 700 }}>Complete the requirements to unlock</div>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  This achievement is locked. Complete lessons and objectives to unlock it.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Related Achievements */}
        {relatedAchievements.length > 0 && (
          <div className="bento-cell" style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ marginTop: 0 }}>Similar Achievements</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "1rem" }}>
              {relatedAchievements.slice(0, 3).map((related) => (
                <div
                  key={related.achievementId}
                  onClick={() => navigate("/achievements/:achievementId", { achievementId: related.achievementId })}
                  style={{
                    padding: "1rem",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "transform var(--t-base)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                    <FallbackGlyph primary={related.icon} fallback={related.icon} />
                  </div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                    {related.title}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back Button */}
        <button
          onClick={() => navigate("/achievements")}
          style={{
            padding: "0.8rem 1.5rem",
            borderRadius: "var(--radius)",
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            cursor: "pointer",
            fontWeight: 700,
            width: "100%",
          }}
        >
          Back to Achievements
        </button>
      </div>
    </section>
  );
}

