import { navigate } from "../../lib/router";
import type { DashboardData } from "../../data/account/repository";

interface ProfileOverviewProps {
  dashboardData: DashboardData;
  avatarSrc: string;
}

export function ProfileOverview({ dashboardData, avatarSrc }: ProfileOverviewProps) {
  const { profile } = dashboardData;

  return (
    <section className="screen profile-screen swiss">
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "1rem" }}>
        <header className="topbar" style={{ marginBottom: "1.5rem" }}>
          <button onClick={() => navigate("/dashboard")}>← Back</button>
          <h1>Profile</h1>
          <div />
        </header>

        {/* Profile Hero */}
        <div className="bento-cell" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "2rem", alignItems: "center" }}>
            <img
              src={avatarSrc}
              alt={profile.displayName}
              style={{ width: "120px", height: "120px", borderRadius: "var(--radius-lg)", border: "3px solid var(--accent)" }}
            />
            <div>
              <h1 style={{ margin: "0 0 0.5rem 0" }}>{profile.displayName}</h1>
              <p style={{ margin: "0 0 1rem 0", color: "var(--text-secondary)" }}>
                {profile.bio}
              </p>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <button
                  onClick={() => navigate("/profile/stats")}
                  style={{
                    padding: "0.6rem 1.2rem",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--accent)",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                  }}
                >
                  View Stats
                </button>
                <button
                  onClick={() => navigate("/profile/customization")}
                  style={{
                    padding: "0.6rem 1.2rem",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--surface)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                  }}
                >
                  Customize
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bento-cell" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ marginTop: 0 }}>Contact Information</h2>
          <dl style={{ display: "grid", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr" }}>
              <dt style={{ fontWeight: 700, color: "var(--text-secondary)" }}>Email:</dt>
              <dd style={{ margin: 0 }}>{profile.email}</dd>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr" }}>
              <dt style={{ fontWeight: 700, color: "var(--text-secondary)" }}>Phone:</dt>
              <dd style={{ margin: 0 }}>{profile.phone}</dd>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr" }}>
              <dt style={{ fontWeight: 700, color: "var(--text-secondary)" }}>Timezone:</dt>
              <dd style={{ margin: 0 }}>{profile.timezone}</dd>
            </div>
          </dl>
        </div>

        {/* Learning Stats */}
        <div className="bento-cell" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ marginTop: 0 }}>Learning Progress</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "1rem" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--accent)" }}>
                {profile.profileLevel}
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Level</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--accent)" }}>
                {profile.xp.toLocaleString()}
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Total XP</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--accent)" }}>
                {profile.streakDays}
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Day Streak</div>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="bento-cell">
          <h2 style={{ marginTop: 0 }}>Account</h2>
          <dl style={{ display: "grid", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr" }}>
              <dt style={{ fontWeight: 700, color: "var(--text-secondary)" }}>Joined:</dt>
              <dd style={{ margin: 0 }}>
                {new Date(profile.joinedDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </dd>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr" }}>
              <dt style={{ fontWeight: 700, color: "var(--text-secondary)" }}>Last Active:</dt>
              <dd style={{ margin: 0 }}>
                {new Date(profile.lastActiveDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </dd>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr" }}>
              <dt style={{ fontWeight: 700, color: "var(--text-secondary)" }}>Theme:</dt>
              <dd style={{ margin: 0, textTransform: "capitalize" }}>{profile.themePreference}</dd>
            </div>
          </dl>
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginTop: "2rem" }}>
          <button
            onClick={() => navigate("/profile/stats")}
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
            View Stats
          </button>
          <button
            onClick={() => navigate("/dashboard")}
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
            Back to Dashboard
          </button>
        </div>
      </div>
    </section>
  );
}
