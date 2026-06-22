import { useState } from "react";
import { navigate } from "../../lib/router";
import type { DashboardData } from "../../data/account/repository";
import { Breadcrumb } from "../shared/Breadcrumb";
import { useToast } from "../shared/Toast";
import { useAppContext } from "../../data/AppContext";
import type { UserSettings } from "../../data/types";

interface SettingsPageProps {
  dashboardData: DashboardData;
}

type Theme = "light" | "dark" | "system";

export function SettingsPage({ dashboardData }: SettingsPageProps) {
  const { showSuccess, showError } = useToast();
  const { profileRepo, userId } = useAppContext();
  const profile = dashboardData.profile;

  const [theme, setTheme]               = useState<Theme>(profile.themePreference);
  const [notifyStreak, setNotifyStreak] = useState(true);
  const [notifyGoals, setNotifyGoals]   = useState(true);
  const [notifyXp, setNotifyXp]         = useState(false);
  const [dailyMinutes, setDailyMinutes] = useState(15);
  const [autoAdvance, setAutoAdvance]   = useState(false);
  const [saving, setSaving]             = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const settings: UserSettings = {
        themePreference: theme,
        dailyGoalMinutes: dailyMinutes,
        autoAdvance,
        notifications: {
          streak: notifyStreak,
          goalComplete: notifyGoals,
          xpMilestone: notifyXp,
        },
      };
      await profileRepo.updateProfile(userId, { settings });
      showSuccess("Settings saved", "Your preferences have been updated.");
    } catch (err) {
      console.error("[SettingsPage] Failed to save settings:", err);
      showError("Save failed", "Could not save your settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="screen swiss page-enter">
      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "1rem" }}>
        <Breadcrumb currentPath="/profile/settings" />

        <header style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Settings
          </h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--muted)", fontSize: "0.88rem" }}>
            Manage your preferences and account
          </p>
        </header>

        {/* ── Appearance ── */}
        <div style={{ marginBottom: "0.5rem", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted)", paddingLeft: "0.25rem" }}>
          Appearance
        </div>
        <div className="settings-section" style={{ marginBottom: "1.5rem" }}>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Theme</div>
              <div className="settings-row-desc">Choose your preferred color scheme</div>
            </div>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {(["light", "dark", "system"] as Theme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  style={{
                    padding: "0.3rem 0.7rem",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    background: theme === t ? "var(--accent)" : "var(--surface-raised)",
                    color: theme === t ? "#fff" : "var(--text-secondary)",
                    border: `1px solid ${theme === t ? "var(--accent)" : "var(--border)"}`,
                    textTransform: "capitalize",
                    letterSpacing: 0,
                  }}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Learning preferences ── */}
        <div style={{ marginBottom: "0.5rem", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted)", paddingLeft: "0.25rem" }}>
          Learning
        </div>
        <div className="settings-section" style={{ marginBottom: "1.5rem" }}>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Daily Goal</div>
              <div className="settings-row-desc">Minutes of study per day</div>
            </div>
            <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
              {[5, 10, 15, 20, 30].map((m) => (
                <button
                  key={m}
                  onClick={() => setDailyMinutes(m)}
                  style={{
                    padding: "0.3rem 0.6rem",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    background: dailyMinutes === m ? "var(--accent)" : "var(--surface-raised)",
                    color: dailyMinutes === m ? "#fff" : "var(--text-secondary)",
                    border: `1px solid ${dailyMinutes === m ? "var(--accent)" : "var(--border)"}`,
                    letterSpacing: 0,
                    textTransform: "none",
                    minWidth: "auto",
                  }}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>

          <div className="settings-row">
            <div>
              <div className="settings-row-label">Auto-advance cards</div>
              <div className="settings-row-desc">Skip the flip — show both sides simultaneously</div>
            </div>
            <label className="settings-toggle" onClick={() => setAutoAdvance((v) => !v)}>
              <div className={`toggle-track${autoAdvance ? " on" : ""}`}>
                <div className="toggle-thumb" />
              </div>
              <span>{autoAdvance ? "On" : "Off"}</span>
            </label>
          </div>
        </div>

        {/* ── Notifications ── */}
        <div style={{ marginBottom: "0.5rem", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted)", paddingLeft: "0.25rem" }}>
          Notifications
        </div>
        <div className="settings-section" style={{ marginBottom: "1.5rem" }}>
          {[
            { label: "Streak reminders", desc: "Get notified before losing your streak", value: notifyStreak, set: setNotifyStreak },
            { label: "Goal completions", desc: "Celebrate when you finish a daily goal", value: notifyGoals, set: setNotifyGoals },
            { label: "XP milestones", desc: "Notify on level-up and major XP gains", value: notifyXp, set: setNotifyXp },
          ].map(({ label, desc, value, set }) => (
            <div key={label} className="settings-row">
              <div>
                <div className="settings-row-label">{label}</div>
                <div className="settings-row-desc">{desc}</div>
              </div>
              <label className="settings-toggle" onClick={() => set((v) => !v)}>
                <div className={`toggle-track${value ? " on" : ""}`}>
                  <div className="toggle-thumb" />
                </div>
                <span>{value ? "On" : "Off"}</span>
              </label>
            </div>
          ))}
        </div>

        {/* ── Account ── */}
        <div style={{ marginBottom: "0.5rem", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted)", paddingLeft: "0.25rem" }}>
          Account
        </div>
        <div className="settings-section" style={{ marginBottom: "1.5rem" }}>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Email</div>
              <div className="settings-row-desc">{profile.email}</div>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 600 }}>Verified ✓</span>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Timezone</div>
              <div className="settings-row-desc">{profile.timezone}</div>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Auto-detected</span>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Member since</div>
              <div className="settings-row-desc">{new Date(profile.joinedDate).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</div>
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/profile")}
            style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}
          >
            Cancel
          </button>
          <button onClick={handleSave} style={{ background: "var(--accent)" }} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </section>
  );
}
