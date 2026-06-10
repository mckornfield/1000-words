import { useState } from "react";
import type { CSSProperties } from "react";
import { navigate } from "../../lib/router";
import type { DashboardData } from "../../data/account/repository";

interface ObjectivesHubProps {
  dashboardData: DashboardData;
}

export function ObjectivesHub({ dashboardData }: ObjectivesHubProps) {
  const { profile, dailyGoals } = dashboardData;
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);

  const xpPct = Math.min(Math.round((profile.xp / profile.xpToNextLevel) * 100), 100);
  const xpToNextLevel = profile.xpToNextLevel - profile.xp;

  // Mock level progression
  const milestones = [
    { level: 10, xp: 2000, achieved: profile.profileLevel >= 10 },
    { level: 15, xp: 3500, achieved: profile.profileLevel >= 15 },
    { level: 20, xp: 5500, achieved: profile.profileLevel >= 20 },
    { level: 25, xp: 8000, achieved: profile.profileLevel >= 25 },
  ];

  return (
    <section className="screen objectives-screen swiss">
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "1rem" }}>
        <header className="topbar" style={{ marginBottom: "1.5rem" }}>
          <button onClick={() => navigate("/dashboard")}>← Back</button>
          <h1>Daily Goals & Milestones</h1>
          <div />
        </header>

        {/* Level Progress */}
        <div className="bento-cell" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ marginTop: 0 }}>Level Progress</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: "2rem", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ fontWeight: 700 }}>Level {profile.profileLevel}</span>
                <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  {xpToNextLevel.toLocaleString()} XP to next level
                </span>
              </div>
              <div style={{ height: "12px", background: "var(--border)", borderRadius: "6px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${xpPct}%`,
                    background: "var(--accent)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                {profile.xp.toLocaleString()} / {profile.xpToNextLevel.toLocaleString()} XP
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3rem", fontWeight: 700, color: "var(--accent)" }}>
                {profile.profileLevel}
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Current Level</div>
            </div>
          </div>
        </div>

        {/* Daily Goals */}
        <div className="bento-cell" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ marginTop: 0 }}>Today's Goals</h2>
          <div style={{ display: "grid", gap: "1rem" }}>
            {dailyGoals.map((goal) => {
              const pct = Math.min(Math.round((goal.progress / goal.target) * 100), 100);
              const isExpanded = expandedGoal === goal.goalId;
              return (
                <div
                  key={goal.goalId}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "1rem",
                    cursor: "pointer",
                    transition: "all var(--t-base)",
                  }}
                  onClick={() => setExpandedGoal(isExpanded ? null : goal.goalId)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--surface-raised)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <div style={{ fontWeight: 700 }}>{goal.title}</div>
                    <div
                      style={{
                        padding: "0.3rem 0.75rem",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        background:
                          goal.status === "completed"
                            ? "var(--status-ok-bg)"
                            : goal.status === "in_progress"
                              ? "var(--status-warn-bg)"
                              : "var(--status-muted-bg)",
                        color:
                          goal.status === "completed"
                            ? "var(--status-ok)"
                            : goal.status === "in_progress"
                              ? "var(--status-warn)"
                              : "var(--status-muted)",
                      }}
                    >
                      {goal.status === "completed" ? "✓ Done" : goal.status === "in_progress" ? "◐ Active" : "Upcoming"}
                    </div>
                  </div>
                  <div style={{ marginBottom: "0.5rem" }}>
                    <div style={{ height: "8px", background: "var(--border)", borderRadius: "4px", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background:
                            goal.status === "completed"
                              ? "var(--status-ok)"
                              : goal.status === "in_progress"
                                ? "var(--status-warn)"
                                : "var(--status-muted)",
                          transition: "width var(--t-base)",
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    <span>
                      {goal.progress} / {goal.target}
                    </span>
                    <span>+{goal.xpReward} XP</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Milestones */}
        <div className="bento-cell" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ marginTop: 0 }}>Level Milestones</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
            {milestones.map((milestone) => (
              <div
                key={milestone.level}
                style={{
                  padding: "1.5rem",
                  borderRadius: "var(--radius)",
                  background: milestone.achieved ? "var(--status-ok-bg)" : "var(--surface-raised)",
                  border: milestone.achieved ? "2px solid var(--status-ok)" : "1px solid var(--border)",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                  Level {milestone.level}
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 700, color: milestone.achieved ? "var(--status-ok)" : "var(--accent)" }}>
                  {milestone.achieved ? "✓" : milestone.xp.toLocaleString()}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                  {milestone.achieved ? "Achieved" : "XP needed"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="bento-cell">
          <h2 style={{ marginTop: 0 }}>Your Statistics</h2>
          <dl style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <div>
              <dt style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                Current Streak
              </dt>
              <dd style={{ margin: 0, fontSize: "1.8rem", fontWeight: 700, color: "var(--accent)" }}>
                {profile.streakDays} days
              </dd>
            </div>
            <div>
              <dt style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                Goals Completed Today
              </dt>
              <dd style={{ margin: 0, fontSize: "1.8rem", fontWeight: 700, color: "var(--accent)" }}>
                {dailyGoals.filter((g) => g.status === "completed").length}
              </dd>
            </div>
            <div>
              <dt style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                Daily Goals Progress
              </dt>
              <dd style={{ margin: 0, fontSize: "1.8rem", fontWeight: 700, color: "var(--accent)" }}>
                {Math.round((dailyGoals.filter((g) => g.status === "completed").length / dailyGoals.length) * 100)}%
              </dd>
            </div>
          </dl>
        </div>

        {/* Back Button */}
        <div style={{ marginTop: "2rem" }}>
          <button
            onClick={() => navigate("/dashboard")}
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
            Back to Dashboard
          </button>
        </div>
      </div>
    </section>
  );
}
