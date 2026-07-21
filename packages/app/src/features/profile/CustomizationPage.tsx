import { navigate } from "../../lib/router";
import { FallbackGlyph } from "../shared/FallbackGlyph";
import { Breadcrumb } from "../shared/Breadcrumb";
import { GiftIcon } from "../shared/icons";
import type { DashboardData } from "../../data/account/repository";

interface CustomizationPageProps {
  dashboardData: DashboardData;
  avatarSrc: string;
}

export function CustomizationPage({ dashboardData, avatarSrc }: CustomizationPageProps) {
  const { profile, storeItems } = dashboardData;

  const categoryLabels: Record<string, string> = {
    profile_picture: "Profile Picture",
    profile_border: "Border",
    profile_accent: "Accent",
  };

  const ownedItems = storeItems.filter((item) => item.isOwned);
  const categorizedItems = {
    profile_picture: ownedItems.filter((item) => item.category === "profile_picture"),
    profile_border: ownedItems.filter((item) => item.category === "profile_border"),
    profile_accent: ownedItems.filter((item) => item.category === "profile_accent"),
  };

  return (
    <section className="screen customization-screen swiss page-enter">
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "1rem" }}>
        <Breadcrumb currentPath="/profile/customization" />
        <header className="topbar" style={{ marginBottom: "1.5rem" }}>
          <button onClick={() => navigate("/profile")}>← Back</button>
          <h1>Customization</h1>
          <div />
        </header>

        {/* Preview */}
        <div className="bento-cell" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ marginTop: 0 }}>Profile Preview</h2>
          <div style={{ background: "linear-gradient(135deg, var(--surface), var(--surface-raised))", padding: "2rem", borderRadius: "var(--radius-lg)", textAlign: "center" }}>
            <img
              src={avatarSrc}
              alt={profile.displayName}
              style={{ width: "120px", height: "120px", borderRadius: "var(--radius-lg)", marginBottom: "1rem", border: "3px solid var(--accent)" }}
            />
            <h1 style={{ margin: "0 0 0.5rem 0" }}>{profile.displayName}</h1>
            <p style={{ margin: "0", color: "var(--text-secondary)" }}>
              {profile.bio}
            </p>
          </div>
        </div>

        {/* Customization Options */}
        {Object.entries(categorizedItems).map(([category, items]) => (
          items.length > 0 && (
            <div key={category} className="bento-cell" style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ marginTop: 0 }}>Select {categoryLabels[category]}</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "1rem" }}>
                {items.map((item) => (
                  <div
                    key={item.storeItemId}
                    style={{
                      padding: "1rem",
                      borderRadius: "var(--radius)",
                      border: item.isEquipped ? "3px solid var(--accent)" : "1px solid var(--border)",
                      background: item.isEquipped ? "var(--status-ok-bg)" : "var(--surface)",
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all var(--t-base)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                      <FallbackGlyph primary={item.emoji} fallback={item.emojiFallback} />
                    </div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      {item.name}
                    </div>
                    {item.isEquipped && (
                      <div style={{ fontSize: "0.7rem", color: "var(--status-ok)", fontWeight: 700, marginTop: "0.25rem" }}>
                        ✓ Equipped
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        ))}

        {ownedItems.length === 0 && (
          <div className="bento-cell" style={{ marginBottom: "1.5rem", background: "var(--status-muted-bg)", textAlign: "center", padding: "2rem" }}>
            <div style={{ marginBottom: "1rem" }}><GiftIcon size="2rem" /></div>
            <h3 style={{ marginTop: 0 }}>No Customizations Yet</h3>
            <p style={{ margin: "0 0 1rem 0", color: "var(--text-secondary)" }}>
              Visit the shop to purchase cosmetics for your profile.
            </p>
            <button
              onClick={() => navigate("/shop")}
              style={{
                padding: "0.6rem 1.2rem",
                borderRadius: "var(--radius-sm)",
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Visit Shop
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
          <button
            onClick={() => navigate("/shop")}
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
            Shop
          </button>
          <button
            onClick={() => navigate("/profile")}
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
            Back
          </button>
        </div>
      </div>
    </section>
  );
}
