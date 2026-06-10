import type { DashboardData } from "../../data/account/repository";
import { FallbackGlyph } from "../shared/FallbackGlyph";

interface DashboardPageProps {
  dashboardData: DashboardData;
  avatarSrc: string;
  onSignOut: () => void;
}

export function DashboardPage({ dashboardData, avatarSrc, onSignOut }: DashboardPageProps) {
  const completedLessons = dashboardData.lessons.filter((lesson) => lesson.status === "completed").length;
  const completedAchievements = dashboardData.achievements.filter(
    (achievement) => achievement.status === "completed",
  ).length;
  const xpProgressPercent = Math.round(
    (dashboardData.profile.xp / dashboardData.profile.xpToNextLevel) * 100,
  );

  return (
    <section className="screen dashboard-screen swiss">
      <div className="dashboard-shell bento">
        <header className="bento-cell topbar">
          <h1>Student Dashboard</h1>
          <button onClick={onSignOut}>SIGN OUT</button>
        </header>

        <article className="bento-cell profile-card">
          <div className="profile-main">
            <img
              className="profile-avatar"
              src={avatarSrc}
              alt={`${dashboardData.profile.displayName} avatar ${dashboardData.profile.avatarFallbackText}`}
            />
            <div>
              <p className="profile-meta">{dashboardData.profile.profileBannerId}</p>
              <h2>
                <FallbackGlyph primary="⚡" fallback="[!]" className="profile-accent" />
                {dashboardData.profile.displayName}
              </h2>
              <p>{dashboardData.profile.bio}</p>
            </div>
          </div>
          <dl className="profile-stats">
            <div>
              <dt>PROFILE ID</dt>
              <dd>{dashboardData.profile.profileId}</dd>
            </div>
            <div>
              <dt>EMAIL</dt>
              <dd>{dashboardData.profile.email}</dd>
            </div>
            <div>
              <dt>PHONE</dt>
              <dd>{dashboardData.profile.phone}</dd>
            </div>
          </dl>
        </article>

        <article className="bento-cell xp-card swiss-rule">
          <h3>XP + Level</h3>
          <p className="xp-level">LEVEL {dashboardData.profile.profileLevel}</p>
          <p>{dashboardData.profile.xp} / {dashboardData.profile.xpToNextLevel} XP</p>
          <div className="progress-track" role="progressbar" aria-valuenow={xpProgressPercent}>
            <span style={{ width: `${Math.min(xpProgressPercent, 100)}%` }} />
          </div>
          <p>Streak: {dashboardData.profile.streakDays} days</p>
        </article>

        <article className="bento-cell lessons-card">
          <h3>Lesson Track</h3>
          <p>{completedLessons} completed · {dashboardData.lessons.length} total lessons</p>
          <ul>
            {dashboardData.lessons.map((lesson) => (
              <li key={lesson.lessonId}>
                <p>
                  <strong>{lesson.title}</strong> ({lesson.lessonId})
                </p>
                <p>{lesson.description}</p>
                <p>
                  {lesson.status} · {lesson.completionPercent}% · {lesson.xpReward} XP
                </p>
              </li>
            ))}
          </ul>
        </article>

        <article className="bento-cell achievements-card">
          <h3>Achievements</h3>
          <p>{completedAchievements} unlocked</p>
          <ul>
            {dashboardData.achievements.map((achievement) => (
              <li key={achievement.achievementId}>
                <FallbackGlyph
                  primary={achievement.icon}
                  fallback={achievement.iconFallback}
                  className="icon-inline"
                />
                <div>
                  <p>
                    <strong>{achievement.title}</strong> ({achievement.achievementId})
                  </p>
                  <p>{achievement.description}</p>
                  <p>
                    {achievement.status} · {achievement.xpReward} XP · {achievement.rarity}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="bento-cell goals-card">
          <h3>Daily Goals</h3>
          <ul>
            {dashboardData.dailyGoals.map((goal) => (
              <li key={goal.goalId}>
                <p>
                  <strong>{goal.title}</strong> ({goal.goalId})
                </p>
                <p>
                  {goal.progress}/{goal.target} · {goal.xpReward} XP · {goal.status}
                </p>
              </li>
            ))}
          </ul>
        </article>

        <article className="bento-cell store-card">
          <h3>Rewards Store</h3>
          <ul>
            {dashboardData.storeItems.map((item) => (
              <li key={item.storeItemId}>
                <FallbackGlyph primary={item.emoji} fallback={item.emojiFallback} className="icon-inline" />
                <div>
                  <p>
                    <strong>{item.name}</strong> ({item.storeItemId})
                  </p>
                  <p>{item.description}</p>
                  <p>
                    {item.priceXp} XP · {item.category} · owned={String(item.isOwned)} · equipped=
                    {String(item.isEquipped)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="bento-cell timeline-card">
          <h3>Activity Timeline</h3>
          <ul>
            {dashboardData.activityTimeline.map((event) => (
              <li key={event.eventId}>
                <FallbackGlyph primary={event.icon} fallback={event.iconFallback} className="icon-inline" />
                <div>
                  <p>
                    <strong>{event.title}</strong> ({event.eventId})
                  </p>
                  <p>{event.detail}</p>
                  <p>{new Date(event.timestamp).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
