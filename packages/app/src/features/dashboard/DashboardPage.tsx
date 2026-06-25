import type { CSSProperties } from "react";
import type { DashboardData } from "../../data/account/repository";
import { navigate } from "../../lib/router";
import { FallbackGlyph } from "../shared/FallbackGlyph";

interface DashboardPageProps {
  dashboardData: DashboardData;
  avatarSrc: string;
  onSignOut: () => void;
}

/**
 * Returns a human-readable relative date string ("Today", "Yesterday", "3d ago",
 * or an abbreviated locale date for older entries). Returns an empty string for
 * any input that does not parse to a valid date.
 */
function relativeDate(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) {
    console.warn(`[DashboardPage] relativeDate received an invalid date string: "${isoString}"`);
    return "";
  }
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Returns a locale-formatted short date (e.g. "Jun 10, 2026").
 * Returns an empty string when the input is not a parseable date.
 */
function shortDate(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) {
    console.warn(`[DashboardPage] shortDate received an invalid date string: "${isoString}"`);
    return "";
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Maps a lesson status value to the display label shown in the badge. */
function lessonStatusLabel(status: string): string {
  if (status === "completed") return "Complete";
  if (status === "in_progress") return "In Progress";
  return "Locked";
}

/** Maps a lesson status value to its CSS badge class. */
function lessonStatusBadge(status: string): string {
  if (status === "completed") return "badge badge-ok";
  if (status === "in_progress") return "badge badge-warn";
  return "badge badge-muted";
}

/**
 * Maps an achievement status to its CSS badge class.
 * "locked" items use muted styling — not warn — to avoid implying they are
 * in progress when they have not yet been started.
 */
function achievementStatusBadge(status: string): string {
  if (status === "completed") return "badge badge-ok";
  if (status === "in_progress") return "badge badge-warn";
  return "badge badge-muted";
}

/** Maps an achievement status to its display label. */
function achievementStatusLabel(status: string): string {
  if (status === "completed") return "Unlocked";
  if (status === "in_progress") return "In Progress";
  return "Locked";
}

/** Maps a goal status value to its CSS badge class. */
function goalStatusBadge(status: string): string {
  if (status === "completed") return "badge badge-ok";
  if (status === "in_progress") return "badge badge-warn";
  return "badge badge-muted";
}

/** Maps a goal status value to its display label. */
function goalStatusLabel(status: string): string {
  if (status === "completed") return "Done";
  if (status === "in_progress") return "Active";
  return "Upcoming";
}

export function DashboardPage({ dashboardData, avatarSrc, onSignOut }: DashboardPageProps) {
  const completedLessons = dashboardData.lessons.filter((l) => l.status === "completed").length;
  const completedAchievements = dashboardData.achievements.filter((a) => a.status === "completed").length;
  const xpPct = Math.min(
    Math.round((dashboardData.profile.xp / dashboardData.profile.xpToNextLevel) * 100),
    100,
  );

  return (
    <section className="screen dashboard-screen swiss">
      <div className="dashboard-shell">

        {/* Top bar */}
        <header className="bento-cell topbar">
          <h1>1000 Words</h1>
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

        {/* Profile */}
        <article className="bento-cell profile-card" onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>
          <div className="profile-main">
            <img
              className="profile-avatar"
              src={avatarSrc}
              alt={`${dashboardData.profile.displayName} avatar`}
            />
            <div>
              <h2 className="profile-name">{dashboardData.profile.displayName}</h2>
              <p className="profile-bio">{dashboardData.profile.bio}</p>
            </div>
          </div>
          <dl className="profile-stats">
            <div>
              <dt>Email</dt>
              <dd>{dashboardData.profile.email}</dd>
            </div>
            <div>
              <dt>Joined</dt>
              <dd>{shortDate(dashboardData.profile.joinedDate)}</dd>
            </div>
            <div>
              <dt>Timezone</dt>
              <dd>{dashboardData.profile.timezone}</dd>
            </div>
          </dl>
        </article>

        {/* XP + Level */}
        <article className="bento-cell xp-card swiss-rule" onClick={() => navigate("/objectives")} style={{ cursor: "pointer" }}>
          <p className="xp-eyebrow">Level</p>
          <p className="xp-level">{dashboardData.profile.profileLevel}</p>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuenow={xpPct}
            aria-label="XP progress to next level"
          >
            <span
              className="progress-fill"
              style={{ "--p": `${xpPct}%` } as CSSProperties}
            />
          </div>
          <p className="xp-meta">
            {dashboardData.profile.xp.toLocaleString()} / {dashboardData.profile.xpToNextLevel.toLocaleString()} XP
          </p>
          <div className="streak-row">
            <FallbackGlyph primary="🔥" fallback="[streak]" />
            <span className="streak-count">{dashboardData.profile.streakDays}</span>
            <span className="streak-label">day streak</span>
          </div>
        </article>

        {/* Daily Goals */}
        <article className="bento-cell goals-card">
          <div className="card-header">
            <h3 onClick={() => navigate("/objectives")} style={{ cursor: "pointer" }}>Daily Goals</h3>
          </div>
          <ul className="goals-list">
            {dashboardData.dailyGoals.map((goal) => {
              const pct = Math.min(Math.round((goal.progress / goal.target) * 100), 100);
              return (
                <li key={goal.goalId} onClick={() => navigate("/objectives/:objectiveId", { objectiveId: goal.goalId })} style={{ cursor: "pointer" }}>
                  <div className="goal-header">
                    <span className="goal-title">{goal.title}</span>
                    <span className={goalStatusBadge(goal.status)}>
                      {goalStatusLabel(goal.status)}
                    </span>
                  </div>
                  <div className="goal-progress-track">
                    <span
                      className="goal-progress-fill"
                      style={{ "--p": `${pct}%` } as CSSProperties}
                    />
                  </div>
                  <p className="goal-meta">{goal.progress} / {goal.target} &middot; {goal.xpReward} XP</p>
                </li>
              );
            })}
          </ul>
        </article>

        {/* Lessons */}
        <article className="bento-cell lessons-card">
          <div className="card-header">
            <h3 onClick={() => navigate("/lessons")} style={{ cursor: "pointer" }}>Lesson Track</h3>
            <span className="card-meta">{completedLessons} of {dashboardData.lessons.length} complete</span>
          </div>
          <ul className="lessons-list">
            {dashboardData.lessons.map((lesson) => (
              <li
                key={lesson.lessonId}
                className="lesson-item"
                onClick={() => navigate("/lessons/:lessonId", { lessonId: lesson.lessonId })}
                style={{ cursor: "pointer" }}
              >
                <div className="lesson-header">
                  <span className="lesson-title">{lesson.title}</span>
                  <span className={lessonStatusBadge(lesson.status)}>
                    {lessonStatusLabel(lesson.status)}
                  </span>
                </div>
                <p className="lesson-desc">{lesson.description}</p>
                <div className="lesson-footer">
                  <div className="lesson-progress-track">
                    <span
                      className="lesson-progress-fill"
                      style={{ "--p": `${lesson.completionPercent}%` } as CSSProperties}
                    />
                  </div>
                  <span className="lesson-xp">{lesson.completionPercent}% &middot; {lesson.xpReward} XP</span>
                </div>
              </li>
            ))}
          </ul>
        </article>

        {/* Achievements */}
        <article className="bento-cell achievements-card">
          <div className="card-header">
            <h3 onClick={() => navigate("/achievements")} style={{ cursor: "pointer" }}>Achievements</h3>
            <span className="card-meta">{completedAchievements} unlocked</span>
          </div>
          <ul className="achievements-list">
            {dashboardData.achievements.map((a) => (
              <li
                key={a.achievementId}
                className="achievement-item"
                onClick={() => navigate("/achievements/:achievementId", { achievementId: a.achievementId })}
                style={{ cursor: "pointer" }}
              >
                <div className="achievement-icon">
                  <FallbackGlyph primary={a.icon} fallback={a.iconFallback} />
                </div>
                <div className="achievement-content">
                  <div className="achievement-row">
                    <span className="achievement-title">{a.title}</span>
                    <div className="achievement-badges">
                      <span className={`badge badge-${a.rarity}`}>{a.rarity}</span>
                      {/* Use dedicated helpers so "locked" is not labelled as "In Progress" */}
                      <span className={achievementStatusBadge(a.status)}>
                        {achievementStatusLabel(a.status)}
                      </span>
                    </div>
                  </div>
                  <p className="achievement-desc">{a.description}</p>
                  <p className="achievement-meta">
                    {a.xpReward} XP
                    {a.completedAt ? ` \u00B7 Earned ${shortDate(a.completedAt)}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </article>

        {/* Rewards Store */}
        <article className="bento-cell store-card">
          <div className="card-header">
            <h3 onClick={() => navigate("/shop")} style={{ cursor: "pointer" }}>Rewards Store</h3>
          </div>
          <ul className="store-list">
            {dashboardData.storeItems.map((item) => (
              <li
                key={item.storeItemId}
                className="store-item"
                onClick={() => navigate("/shop/:itemId", { itemId: item.storeItemId })}
                style={{ cursor: "pointer" }}
              >
                <div className="store-icon">
                  <FallbackGlyph primary={item.emoji} fallback={item.emojiFallback} />
                </div>
                <div className="store-content">
                  <div className="store-row">
                    <span className="store-name">{item.name}</span>
                    <span className="store-price">{item.priceXp.toLocaleString()} XP</span>
                  </div>
                  <p className="store-desc">{item.description}</p>
                  <div className="store-badges">
                    {item.isOwned && <span className="badge badge-owned">Owned</span>}
                    {item.isEquipped && <span className="badge badge-equipped">Equipped</span>}
                    {!item.isOwned && <span className="badge badge-muted">Available</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </article>

        {/* Activity Timeline */}
        <article className="bento-cell timeline-card">
          <div className="card-header">
            <h3>Recent Activity</h3>
          </div>
          <ul className="timeline-list">
            {dashboardData.activityTimeline.map((event) => (
              <li key={event.eventId} className="timeline-item">
                <div className="timeline-icon">
                  <FallbackGlyph primary={event.icon} fallback={event.iconFallback} />
                </div>
                <div className="timeline-content">
                  <div className="timeline-row">
                    <span className="timeline-title">{event.title}</span>
                    <span className="timeline-time">{relativeDate(event.timestamp)}</span>
                  </div>
                  <p className="timeline-detail">{event.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </article>

        {/* Leaderboard */}
        <article className="bento-cell leaderboard-card swiss-rule">
          <div className="card-header">
            <h3>Leaderboard</h3>
            <span className="card-meta">Top 50</span>
          </div>
          <div>
            <button
              onClick={() => navigate("/leaderboard")}
              style={{
                width: "100%",
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                padding: "10px 0",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.88rem",
                fontWeight: 700,
                cursor: "pointer",
                marginTop: 8,
              }}
            >
              View Rankings
            </button>
          </div>
        </article>

      </div>
    </section>
  );
}
