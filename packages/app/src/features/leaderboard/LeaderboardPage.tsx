import { useState, useEffect } from "react";
import { navigate } from "../../lib/router";
import { useAppContext } from "../../data/AppContext";
import type { LeaderboardEntry } from "../../data/types";
import { FallbackGlyph } from "../shared/FallbackGlyph";
import { useToast } from "../shared/Toast";
import type { DashboardData, StoreItem } from "../../data/account/repository";

// ─── Constants ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#c0392b",
  "#2563eb",
  "#16a34a",
  "#b45309",
  "#7c3aed",
  "#0891b2",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avatarColor(name: string): string {
  if (!name) return AVATAR_COLORS[0]!;
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]!;
}

function resolveCosmetic(
  itemId: string | null,
  storeItems: StoreItem[],
): { emoji: string; emojiFallback: string } | null {
  if (!itemId) return null;
  const item = storeItems.find((s) => s.storeItemId === itemId);
  if (!item) return null;
  const emoji = item.emoji ?? "";
  const emojiFallback = item.emojiFallback ?? "";
  return { emoji, emojiFallback };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InitialsAvatar({ name }: { name: string }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: avatarColor(name),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 700,
        fontSize: "1.1rem",
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {name.charAt(0).toUpperCase() || "?"}
    </div>
  );
}

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  storeItems: StoreItem[];
}

function LeaderboardRow({ entry, isCurrentUser, storeItems }: LeaderboardRowProps) {
  const borderCosmetic = resolveCosmetic(entry.equippedBorderId, storeItems);
  const badgeCosmetic = resolveCosmetic(entry.equippedBadgeId, storeItems);

  const rankCell = () => {
    if (entry.rank === 1) {
      return (
        <>
          <span aria-hidden="true">🥇</span>
          <span className="sr-only">Rank 1</span>
        </>
      );
    }
    if (entry.rank === 2) {
      return (
        <>
          <span aria-hidden="true">🥈</span>
          <span className="sr-only">Rank 2</span>
        </>
      );
    }
    if (entry.rank === 3) {
      return (
        <>
          <span aria-hidden="true">🥉</span>
          <span className="sr-only">Rank 3</span>
        </>
      );
    }
    return `#${entry.rank}`;
  };

  return (
    <li
      style={{
        padding: "12px 16px",
        minHeight: 48,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: isCurrentUser ? "var(--surface-raised)" : "var(--surface)",
        border: isCurrentUser
          ? "1.5px solid var(--accent)"
          : "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-sm)",
        marginBottom: 6,
      }}
      aria-label={isCurrentUser ? "Your ranking" : undefined}
    >
      {/* Rank column */}
      <div
        style={{
          width: 32,
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
          fontSize: "0.88rem",
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {rankCell()}
      </div>

      {/* Avatar column */}
      <div
        style={{
          position: "relative",
          width: 40,
          height: 40,
          flexShrink: 0,
        }}
      >
        <InitialsAvatar name={entry.displayName} />
        {borderCosmetic && (
          <span
            style={{
              position: "absolute",
              bottom: -4,
              right: -4,
              fontSize: "0.9rem",
            }}
          >
            <FallbackGlyph
              primary={borderCosmetic.emoji}
              fallback={borderCosmetic.emojiFallback}
            />
          </span>
        )}
      </div>

      {/* Name + Badge column */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <span
          style={{
            fontSize: "0.88rem",
            fontWeight: 700,
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {entry.displayName}
          {badgeCosmetic && (
            <span style={{ marginLeft: 4, fontSize: "0.9rem" }}>
              <FallbackGlyph
                primary={badgeCosmetic.emoji}
                fallback={badgeCosmetic.emojiFallback}
              />
            </span>
          )}
        </span>
      </div>

      {/* Level column */}
      <div
        className="level-col"
        style={{
          width: 44,
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "var(--accent)",
          }}
        >
          {entry.level}
        </div>
        <div
          style={{
            fontSize: "0.67rem",
            fontWeight: 400,
            color: "var(--muted)",
            textTransform: "uppercase",
          }}
        >
          Lv
        </div>
      </div>

      {/* RankValue column */}
      <div
        style={{
          width: 52,
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "var(--text)",
          }}
        >
          {entry.rankValue.toLocaleString()}
        </div>
        <div
          style={{
            fontSize: "0.67rem",
            fontWeight: 400,
            color: "var(--muted)",
            textTransform: "uppercase",
          }}
        >
          pts
        </div>
      </div>
    </li>
  );
}

function Separator() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        margin: "8px 0",
      }}
    >
      <hr
        style={{
          flex: 1,
          borderTop: "1px dashed var(--border)",
          border: "none",
          borderTopStyle: "dashed",
          borderTopWidth: 1,
          borderTopColor: "var(--border)",
        }}
      />
      <span style={{ color: "var(--muted)", fontSize: "0.75rem", fontWeight: 600 }}>
        You
      </span>
      <hr
        style={{
          flex: 1,
          border: "none",
          borderTopStyle: "dashed",
          borderTopWidth: 1,
          borderTopColor: "var(--border)",
        }}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function LeaderboardPage({ dashboardData }: { dashboardData: DashboardData }) {
  const { leaderboardRepo, userId } = useAppContext();
  const toast = useToast();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      leaderboardRepo.getTopN(50),
      leaderboardRepo.getCurrentUserEntry(userId),
    ])
      .then(([top, me]) => {
        setEntries(top);
        setCurrentEntry(me);
      })
      .catch(() => {
        toast.showError("Could not load leaderboard. Please try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [leaderboardRepo, userId]);

  const currentUserInTop = entries.some((e) => e.userId === userId);
  const shouldPinUser = currentEntry !== null && !currentUserInTop;

  const skeletonRows = Array.from({ length: 8 }).map((_, i) => (
    <div
      key={i}
      role="status"
      aria-label="Loading leaderboard"
      style={{
        height: 48,
        background: "var(--border)",
        borderRadius: "var(--radius-sm)",
        marginBottom: 6,
        animation: "subtlePulse 1.4s ease infinite",
        animationDelay: `${i * 80}ms`,
      }}
    />
  ));

  return (
    <section className="screen leaderboard-screen swiss page-enter">
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "1rem" }}>
        <header className="topbar">
          <button onClick={() => navigate("/dashboard")}>&#8592; Dashboard</button>
          <h1>Leaderboard</h1>
          <div />
        </header>

        {loading ? (
          <div>{skeletonRows}</div>
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: "3rem", opacity: 0.6 }}>🏆</span>
            <h3>No rankings yet</h3>
            <p>Be the first to complete lessons and earn a spot.</p>
          </div>
        ) : (
          <ol
            aria-label="Leaderboard — Top 50 players"
            style={{ listStyle: "none", padding: 0, margin: 0 }}
          >
            {entries.map((e) => (
              <LeaderboardRow
                key={e.userId}
                entry={e}
                isCurrentUser={e.userId === userId}
                storeItems={dashboardData.storeItems}
              />
            ))}
          </ol>
        )}

        {shouldPinUser && currentEntry && (
          <>
            <Separator />
            <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
              <LeaderboardRow
                entry={currentEntry}
                isCurrentUser={true}
                storeItems={dashboardData.storeItems}
              />
            </ol>
          </>
        )}
      </div>
    </section>
  );
}
