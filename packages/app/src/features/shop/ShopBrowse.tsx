import { useState } from "react";
import { buildRoutePath, navigate } from "../../lib/router";
import { FallbackGlyph } from "../shared/FallbackGlyph";
import { CoinIcon, LockedIcon } from "../shared/icons";
import type { DashboardData } from "../../data/account/repository";
import { useAppState } from "../../data/AppContext";

interface ShopBrowseProps {
  dashboardData: DashboardData;
}

type CategoryFilter = "all" | "profile_picture" | "profile_border" | "profile_accent";
type OwnershipFilter = "all" | "owned" | "available";

export function ShopBrowse({ dashboardData }: ShopBrowseProps) {
  const { snapshot } = useAppState();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>("all");
  const [sortBy, setSortBy] = useState<"price_asc" | "price_desc" | "name">("price_asc");
  const earnedIds = new Set(snapshot.achievements.map((achievement) => achievement.achievementId));
  const ownedIds = new Set(snapshot.inventory.map((record) => record.itemId));
  const equippedIds = new Set(snapshot.equipped.map((record) => record.itemId));
  const userTokens = snapshot.profile?.tokens ?? dashboardData.profile.tokens;

  const filteredItems = dashboardData.storeItems
    .filter((item) => {
      const categoryMatch = categoryFilter === "all" || item.category === categoryFilter;
      const ownershipMatch =
        ownershipFilter === "all" ||
        (ownershipFilter === "owned" && ownedIds.has(item.storeItemId)) ||
        (ownershipFilter === "available" && !ownedIds.has(item.storeItemId));
      return categoryMatch && ownershipMatch;
    })
    .sort((a, b) => {
      if (sortBy === "price_asc") return a.tokenCost - b.tokenCost;
      if (sortBy === "price_desc") return b.tokenCost - a.tokenCost;
      return a.name.localeCompare(b.name);
    });

  const categories = [
    { value: "profile_picture", label: "Profile Pictures" },
    { value: "profile_border", label: "Borders" },
    { value: "profile_accent", label: "Accents" },
  ];

  return (
    <section className="screen shop-screen swiss page-enter">
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1rem" }}>
        <header className="topbar" style={{ marginBottom: "1.5rem" }}>
          <button onClick={() => navigate("/dashboard")}>← Back</button>
          <h1>Rewards Shop</h1>
          <div />
        </header>

        {/* Token Balance */}
        <div className="bento-cell" style={{ marginBottom: "1.5rem", background: "linear-gradient(135deg, var(--accent), #a93226)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff" }}>
            <div>
              <div style={{ fontSize: "0.9rem", opacity: 0.9 }}>Your Token Balance</div>
              <div style={{ fontSize: "2rem", fontWeight: 700 }}>{userTokens.toLocaleString()}</div>
            </div>
            <div><CoinIcon size="3rem" /></div>
          </div>
        </div>

        {/* Filters */}
        <div className="bento-cell" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                Category
              </label>
              <select
                aria-label="Filter rewards by category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
                style={{
                  width: "100%",
                  padding: "0.7rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
                }}
              >
                <option value="all">All Items</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                Status
              </label>
              <select
                aria-label="Filter rewards by ownership status"
                value={ownershipFilter}
                onChange={(e) => setOwnershipFilter(e.target.value as OwnershipFilter)}
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
                <option value="owned">Owned</option>
                <option value="available">Available</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                Sort By
              </label>
              <select
                aria-label="Sort rewards"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "price_asc" | "price_desc" | "name")}
                style={{
                  width: "100%",
                  padding: "0.7rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
                }}
              >
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>
        </div>

        {/* Items Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1.5rem" }}>
          {filteredItems.map((item) => {
            const isAchLocked = item.achievementIdRequired !== null && !earnedIds.has(item.achievementIdRequired);
            const canAfford = userTokens >= item.tokenCost;
            const isOwned = ownedIds.has(item.storeItemId);
            const isEquipped = equippedIds.has(item.storeItemId);

            return (
              <a
                key={item.storeItemId}
                href={buildRoutePath("/shop/:itemId", { itemId: item.storeItemId })}
                onClick={(event) => {
                  // Use router navigation for SPA behavior, but allow native-
                  // navigation (Ctrl/Cmd-click) for link inspection.
                  if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
                    event.preventDefault();
                    navigate("/shop/:itemId", { itemId: item.storeItemId });
                  }
                }}
                className="bento-cell"
                style={{
                  cursor: "pointer",
                  color: "inherit",
                  textDecoration: "none",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  transition: "transform var(--t-base), box-shadow var(--t-base)",
                  opacity: isAchLocked ? 0.55 : isEquipped ? 1 : 0.95,

                  border: isEquipped ? "2px solid var(--accent)" : "1px solid var(--border)",
                  overflow: "hidden",
                  }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {isAchLocked && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      // High opacity so the card's own title/description (still full-color underneath)
                      // doesn't bleed through and collide with this overlay's text.
                      background: "rgba(0,0,0,0.88)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 10,
                      gap: "0.25rem",
                      borderRadius: "var(--radius)",
                    }}
                  >
                    <LockedIcon size="1.5rem" />
                    <span style={{ color: "#fff", fontSize: "0.75rem", fontWeight: 600, textAlign: "center", padding: "0 0.75rem" }}>
                      Achievement required
                    </span>
                  </div>
                )}

                {isEquipped && (
                  <div
                    style={{
                      position: "absolute",
                      top: "0.5rem",
                      right: "0.5rem",
                      background: "var(--accent)",
                      color: "#fff",
                      padding: "0.3rem 0.75rem",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      zIndex: 5,
                    }}
                  >
                    ✓ Equipped
                  </div>
                )}

                <div style={{ fontSize: "2.5rem", marginBottom: "1rem", textAlign: "center", filter: isAchLocked ? "grayscale(1)" : "none" }}>
                  <FallbackGlyph primary={item.emoji} fallback={item.emojiFallback} />
                </div>

                <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.05rem" }}>
                  {item.name}
                </h3>

                <p style={{ margin: "0 0 1rem 0", fontSize: "0.85rem", color: "var(--text-secondary)", flex: 1 }}>
                  {item.description}
                </p>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: "1rem",
                    borderTop: "1px solid var(--border-subtle)",
                  }}
                >
                  <div style={{ fontSize: "0.9rem", fontWeight: 700, color: canAfford ? "var(--accent)" : "var(--muted)", display: "flex", alignItems: "center", gap: "0.3em" }}>
                    {item.tokenCost} <CoinIcon size="0.9em" />
                  </div>
                  {isOwned ? (
                    <span style={{ padding: "0.3rem 0.75rem", borderRadius: "var(--radius-sm)", fontSize: "0.7rem", fontWeight: 700, background: "var(--status-ok-bg)", color: "var(--status-ok)" }}>
                      Owned
                    </span>
                  ) : isAchLocked ? (
                    <span style={{ padding: "0.3rem 0.75rem", borderRadius: "var(--radius-sm)", fontSize: "0.7rem", fontWeight: 700, background: "var(--status-muted-bg)", color: "var(--status-muted)" }}>
                      <LockedIcon size="0.9em" /> Locked
                    </span>
                  ) : canAfford ? (
                    <span style={{ padding: "0.3rem 0.75rem", borderRadius: "var(--radius-sm)", fontSize: "0.7rem", fontWeight: 700, background: "var(--accent)", color: "#fff" }}>
                      Available
                    </span>
                  ) : (
                    <span style={{ padding: "0.3rem 0.75rem", borderRadius: "var(--radius-sm)", fontSize: "0.7rem", fontWeight: 700, background: "var(--status-muted-bg)", color: "var(--status-muted)" }}>
                      Need tokens
                    </span>
                  )}
                </div>
              </a>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-secondary)" }}>
            <p style={{ fontSize: "1.1rem" }}>No items match your filters.</p>
          </div>
        )}
      </div>
    </section>
  );
}
