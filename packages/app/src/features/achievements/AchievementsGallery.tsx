import { useEffect, useState } from "react";
import { navigate } from "../../lib/router";
import { FallbackGlyph } from "../shared/FallbackGlyph";
import type { DashboardData } from "../../data/account/repository";
import { useAppContext } from "../../data/AppContext";
import type { UserAchievement } from "../../data/types";

interface AchievementsGalleryProps {
  dashboardData: DashboardData;
}

type RarityFilter = "all" | "common" | "rare" | "epic" | "legendary";
type StatusFilter = "all" | "completed" | "in_progress" | "locked";

export function AchievementsGallery({ dashboardData }: AchievementsGalleryProps) {
  const { userId, achievementRepo } = useAppContext();
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);

  useEffect(() => {
    achievementRepo.getUserAchievements(userId).then(setUserAchievements).catch(console.error);
  }, [userId, achievementRepo]);

  const earnedIds = new Set(userAchievements.map((a) => a.achievementId));

  function deriveStatus(ach: (typeof dashboardData.achievements)[number]): "completed" | "in_progress" | "locked" {
    if (earnedIds.has(ach.achievementId)) return "completed";
    if (ach.prerequisiteId && !earnedIds.has(ach.prerequisiteId)) return "locked";
    return ach.status === "completed" ? "in_progress" : ach.status;
  }

  const enriched = dashboardData.achievements.map((a) => ({
    ...a,
    liveStatus: deriveStatus(a),
    earnedAt: userAchievements.find((u) => u.achievementId === a.achievementId)?.earnedAt ?? null,
  }));

  const filteredAchievements = enriched.filter((a) => {
    const matchesRarity = rarityFilter === "all" || a.rarity === rarityFilter;
    const matchesStatus = statusFilter === "all" || a.liveStatus === statusFilter;
    return matchesRarity && matchesStatus;
  });

  const stats = {
    total: enriched.length,
    completed: enriched.filter((a) => a.liveStatus === "completed").length,
    inProgress: enriched.filter((a) => a.liveStatus === "in_progress").length,
    locked: enriched.filter((a) => a.liveStatus === "locked").length,
  };

  const rarityColors: Record<string, string> = {
    common: "#78746e",
    rare: "#3498db",
    epic: "#9b59b6",
    legendary: "#f39c12",
  };

  return (
    <section className="screen achievements-screen swiss page-enter">
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1rem" }}>
        <header className="topbar" style={{ marginBottom: "1.5rem" }}>
          <button onClick={() => navigate("/dashboard")}>← Back</button>
          <h1>Achievements</h1>
          <div />
        </header>

        {/* Stats */}
        <div className="bento-cell" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "1rem" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--accent)" }}>
                {stats.completed}
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Unlocked</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--status-warn)" }}>
                {stats.inProgress}
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>In Progress</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--muted)" }}>
                {stats.locked}
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Locked</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 700 }}>{stats.total}</div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Total</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bento-cell" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                Rarity
              </label>
              <select
                value={rarityFilter}
                onChange={(e) => setRarityFilter(e.target.value as RarityFilter)}
                style={{
                  width: "100%",
                  padding: "0.7rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
                }}
              >
                <option value="all">All Rarities</option>
                <option value="common">Common</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
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
                <option value="completed">Unlocked</option>
                <option value="in_progress">In Progress</option>
                <option value="locked">Locked</option>
              </select>
            </div>
          </div>
        </div>

        {/* Achievements Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1.5rem" }}>
          {filteredAchievements.map((achievement) => {
            const isLocked = achievement.liveStatus === "locked";
            const isCompleted = achievement.liveStatus === "completed";
            const prereq = achievement.prerequisiteId
              ? dashboardData.achievements.find((a) => a.achievementId === achievement.prerequisiteId)
              : null;

            return (
              <div
                key={achievement.achievementId}
                onClick={() =>
                  navigate("/achievements/:achievementId", { achievementId: achievement.achievementId })
                }
                className="bento-cell"
                style={{
                  cursor: "pointer",
                  textAlign: "center",
                  position: "relative",
                  overflow: "hidden",
                  transition: "transform var(--t-base), box-shadow var(--t-base)",
                  opacity: isLocked ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {isLocked && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0, 0, 0, 0.45)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "var(--radius)",
                      zIndex: 10,
                      gap: "0.25rem",
                    }}
                  >
                    <span style={{ fontSize: "1.5rem" }}>🔒</span>
                    {prereq && (
                      <span style={{ color: "#fff", fontWeight: 600, fontSize: "0.75rem", textAlign: "center", padding: "0 0.5rem" }}>
                        Earn {prereq.title} first
                      </span>
                    )}
                  </div>
                )}

                <div
                  style={{
                    fontSize: "3rem",
                    marginBottom: "1rem",
                    filter: isLocked ? "grayscale(1)" : "none",
                  }}
                >
                  <FallbackGlyph primary={achievement.icon} fallback={achievement.iconFallback} />
                </div>

                <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.05rem" }}>
                  {achievement.title}
                </h3>

                <p style={{ margin: "0 0 1rem 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {achievement.description}
                </p>

                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                  <span
                    style={{
                      padding: "0.3rem 0.75rem",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      background: rarityColors[achievement.rarity] || "var(--muted)",
                      color: "#fff",
                    }}
                  >
                    {achievement.rarity.toUpperCase()}
                  </span>
                  <span
                    style={{
                      padding: "0.3rem 0.75rem",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      background:
                        isCompleted
                          ? "var(--status-ok-bg)"
                          : achievement.liveStatus === "in_progress"
                            ? "var(--status-warn-bg)"
                            : "var(--status-muted-bg)",
                      color:
                        isCompleted
                          ? "var(--status-ok)"
                          : achievement.liveStatus === "in_progress"
                            ? "var(--status-warn)"
                            : "var(--status-muted)",
                    }}
                  >
                    {isCompleted ? "✓ Unlocked" : achievement.liveStatus === "in_progress" ? "◐ In Progress" : "Locked"}
                  </span>
                </div>

                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent)" }}>
                  +{achievement.xpReward} XP
                </div>
              </div>
            );
          })}
        </div>

        {filteredAchievements.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-secondary)" }}>
            <p style={{ fontSize: "1.1rem" }}>No achievements match your filters.</p>
          </div>
        )}
      </div>
    </section>
  );
}
