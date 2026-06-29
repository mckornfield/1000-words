import type { CSSProperties } from "react";
import type { DashboardData } from "../../data/account/repository";
import { navigate } from "../../lib/router";

interface DashboardPageProps {
  dashboardData: DashboardData;
  avatarSrc: string;
  onSignOut: () => void;
}

const STUDY_LANGUAGES = [
  { langPair: "en-es", label: "Study Spanish", flag: "🇪🇸" },
  { langPair: "en-zh", label: "Study Mandarin", flag: "🇨🇳" },
];

function goalStatusBadge(status: string): string {
  if (status === "completed") return "badge badge-ok";
  if (status === "in_progress") return "badge badge-warn";
  return "badge badge-muted";
}

function goalStatusLabel(status: string): string {
  if (status === "completed") return "Done";
  if (status === "in_progress") return "Active";
  return "Upcoming";
}

export function DashboardPage({ dashboardData, avatarSrc, onSignOut }: DashboardPageProps) {
  const { profile, dailyGoals } = dashboardData;
  const xpPct = Math.min(Math.round((profile.xp / profile.xpToNextLevel) * 100), 100);

  return (
    <section className="screen swiss" style={{ paddingBottom: "5rem" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 1rem" }}>

        {/* Header */}
        <header className="bento-cell topbar" style={{ marginBottom: "1rem" }}>
          <h1 style={{ fontSize: "1.1rem" }}>1000 Words</h1>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button
              onClick={() => navigate("/profile/settings")}
              style={{ background: "var(--surface-raised)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
              aria-label="Settings"
            >
              ⚙
            </button>
            <button onClick={onSignOut}>Sign Out</button>
          </div>
        </header>

        {/* Profile strip */}
        <div
          className="bento-cell"
          onClick={() => navigate("/profile")}
          style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", padding: "0.75rem 1rem" }}
        >
          <img
            src={avatarSrc}
            alt={`${profile.displayName} avatar`}
            style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {profile.displayName}
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{profile.bio}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}>
            <span aria-hidden="true">🔥</span>
            <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{profile.streakDays}</span>
            <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>day streak</span>
          </div>
        </div>

        {/* XP / Level */}
        <div className="bento-cell" style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Level {profile.profileLevel}
            </span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              {profile.xp.toLocaleString()} / {profile.xpToNextLevel.toLocaleString()} XP
            </span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuenow={xpPct}
            aria-label="XP progress to next level"
          >
            <span className="progress-fill" style={{ "--p": `${xpPct}%` } as CSSProperties} />
          </div>
        </div>

        {/* Study CTAs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
          {STUDY_LANGUAGES.map(({ langPair, label, flag }) => (
            <button
              key={langPair}
              onClick={() => navigate("/study/:langPair", { langPair })}
              style={{
                padding: "0.9rem 0.5rem",
                fontSize: "0.95rem",
                fontWeight: 800,
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              <span style={{ fontSize: "1.5rem" }}>{flag}</span>
              {label}
            </button>
          ))}
        </div>

        {/* Daily Goals */}
        {dailyGoals.length > 0 && (
          <div className="bento-cell" style={{ marginBottom: "1rem" }}>
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", cursor: "pointer" }}
              onClick={() => navigate("/objectives")}
            >
              <span style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>
                Daily Goals
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>→</span>
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {dailyGoals.map((goal) => {
                const pct = Math.min(Math.round((goal.progress / goal.target) * 100), 100);
                return (
                  <li key={goal.goalId} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                        <span style={{ fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{goal.title}</span>
                        <span className={goalStatusBadge(goal.status)} style={{ marginLeft: "0.5rem", flexShrink: 0 }}>
                          {goalStatusLabel(goal.status)}
                        </span>
                      </div>
                      <div className="goal-progress-track">
                        <span className="goal-progress-fill" style={{ "--p": `${pct}%` } as CSSProperties} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

      </div>
    </section>
  );
}
