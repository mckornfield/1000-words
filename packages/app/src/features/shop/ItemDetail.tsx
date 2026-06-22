import { useState } from "react";
import { navigate } from "../../lib/router";
import { FallbackGlyph } from "../shared/FallbackGlyph";
import { Breadcrumb } from "../shared/Breadcrumb";
import type { DashboardData } from "../../data/account/repository";
import { useToast } from "../shared/Toast";
import { useAppContext } from "../../data/AppContext";
import type { EquipSlot } from "../../data/types";

interface ItemDetailProps {
  dashboardData: DashboardData;
  itemId: string;
}

export function ItemDetail({ dashboardData, itemId }: ItemDetailProps) {
  const item = dashboardData.storeItems.find((i) => i.storeItemId === itemId);
  const { showSuccess, showError } = useToast();
  const { inventoryRepo, profileRepo, userId } = useAppContext();

  const [isOwned, setIsOwned]     = useState(item?.isOwned ?? false);
  const [isEquipped, setIsEquipped] = useState(item?.isEquipped ?? false);
  const [userXP, setUserXP]       = useState(dashboardData.profile.xp);
  const [busy, setBusy]           = useState(false);

  const canAfford = userXP >= (item?.priceXp ?? 0);

  if (!item) {
    return (
      <section className="screen swiss">
        <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
          <h2>Item not found</h2>
          <button onClick={() => navigate("/shop")} style={{ marginTop: "1rem" }}>
            Back to Shop
          </button>
        </div>
      </section>
    );
  }

  const categoryLabels: Record<string, string> = {
    profile_picture: "Profile Picture",
    profile_border: "Border",
    profile_accent: "Accent",
  };

  const handlePurchase = async () => {
    if (busy || !canAfford) return;
    setBusy(true);
    try {
      await inventoryRepo.purchase(userId, item.storeItemId, item.priceXp);
      await profileRepo.addXp(userId, -item.priceXp);
      setIsOwned(true);
      setUserXP((prev) => prev - item.priceXp);
      showSuccess(`Purchased ${item.name}!`, `${item.priceXp} XP deducted from your balance.`);
    } catch (err) {
      console.error("[ItemDetail] Purchase failed:", err);
      showError("Purchase failed", "Could not complete the purchase. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleEquip = async () => {
    if (busy || !isOwned) return;
    setBusy(true);
    try {
      await inventoryRepo.equip(userId, item.category as EquipSlot, item.storeItemId);
      setIsEquipped(true);
      showSuccess(`${item.name} equipped!`, "Your profile has been updated.");
    } catch (err) {
      console.error("[ItemDetail] Equip failed:", err);
      showError("Equip failed", "Could not equip this item. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="screen item-detail-screen swiss page-enter">
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "1rem" }}>
        <Breadcrumb currentPath="/shop/:itemId" params={{ itemId }} labels={{ itemName: item.name }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
          {/* Item Display */}
          <div className="bento-cell">
            <div
              style={{
                background: "linear-gradient(135deg, var(--surface), var(--surface-raised))",
                borderRadius: "var(--radius-lg)",
                padding: "2rem",
                textAlign: "center",
                minHeight: "300px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div>
                <div style={{ fontSize: "5rem", marginBottom: "1rem" }}>
                  <FallbackGlyph primary={item.emoji} fallback={item.emojiFallback} />
                </div>
                <h1 style={{ margin: "0 0 0.5rem 0", fontSize: "1.8rem" }}>{item.name}</h1>
                <p style={{ margin: 0, color: "var(--text-secondary)" }}>{categoryLabels[item.category]}</p>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div>
            {/* Description */}
            <div className="bento-cell" style={{ marginBottom: "1rem" }}>
              <h2 style={{ marginTop: 0 }}>About</h2>
              <p style={{ margin: 0, lineHeight: 1.6, color: "var(--text-secondary)" }}>{item.description}</p>
            </div>

            {/* Price & Balance */}
            <div className="bento-cell" style={{ marginBottom: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>PRICE</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--accent)" }}>{item.priceXp}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>XP</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>YOUR BALANCE</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 700, color: canAfford ? "var(--status-ok)" : "var(--status-warn)" }}>{userXP}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>XP</div>
                </div>
              </div>
            </div>

            {/* Status & Actions */}
            {isOwned ? (
              <div className="bento-cell" style={{ marginBottom: "1rem", background: "var(--status-ok-bg)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", color: "var(--status-ok)" }}>
                  <div style={{ fontSize: "2rem" }}>✓</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>You Own This Item</div>
                    <div style={{ fontSize: "0.85rem" }}>
                      {isEquipped ? "Currently equipped on your profile." : "Available in your collection."}
                    </div>
                  </div>
                </div>
                {!isEquipped && (
                  <button
                    onClick={handleEquip}
                    disabled={busy}
                    style={{ marginTop: "0.75rem", width: "100%", padding: "0.75rem", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius)", fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}
                  >
                    {busy ? "Equipping…" : "Equip Now"}
                  </button>
                )}
              </div>
            ) : canAfford ? (
              <div className="bento-cell" style={{ marginBottom: "1rem" }}>
                <button
                  onClick={handlePurchase}
                  disabled={busy}
                  style={{ width: "100%", padding: "1rem", borderRadius: "var(--radius)", background: "var(--accent)", color: "#fff", border: "none", cursor: busy ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "1rem", opacity: busy ? 0.7 : 1 }}
                >
                  {busy ? "Purchasing…" : `Purchase for ${item.priceXp} XP`}
                </button>
              </div>
            ) : (
              <div className="bento-cell" style={{ marginBottom: "1rem", background: "var(--status-warn-bg)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", color: "var(--status-warn)" }}>
                  <div style={{ fontSize: "2rem" }}>⏳</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>Insufficient Balance</div>
                    <div style={{ fontSize: "0.85rem" }}>
                      You need {item.priceXp - userXP} more XP to purchase this item.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* More Info */}
            <div className="bento-cell">
              <h3 style={{ marginTop: 0 }}>More Information</h3>
              <dl style={{ display: "grid", gap: "0.75rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr" }}>
                  <dt style={{ fontWeight: 700, color: "var(--text-secondary)" }}>Category:</dt>
                  <dd style={{ margin: 0 }}>{categoryLabels[item.category]}</dd>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr" }}>
                  <dt style={{ fontWeight: 700, color: "var(--text-secondary)" }}>Item ID:</dt>
                  <dd style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)" }}>{item.storeItemId}</dd>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr" }}>
                  <dt style={{ fontWeight: 700, color: "var(--text-secondary)" }}>Status:</dt>
                  <dd style={{ margin: 0 }}>
                    {isOwned ? (
                      <span style={{ color: "var(--status-ok)" }}>✓ Owned</span>
                    ) : canAfford ? (
                      <span style={{ color: "var(--accent)" }}>Available</span>
                    ) : (
                      <span style={{ color: "var(--status-warn)" }}>Locked</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "2rem" }}>
          <button
            onClick={() => navigate("/shop")}
            style={{ width: "100%", padding: "0.8rem 1.5rem", borderRadius: "var(--radius)", background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", cursor: "pointer", fontWeight: 700 }}
          >
            Back to Shop
          </button>
        </div>
      </div>
    </section>
  );
}
