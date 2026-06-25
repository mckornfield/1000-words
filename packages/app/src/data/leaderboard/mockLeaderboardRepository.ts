import type { LeaderboardEntry, LeaderboardRepository } from "../types";

// Must match the SQL formula: FLOOR(xp / 250)::int + 1
function xpToLevel(xp: number): number {
  return Math.floor(xp / 250) + 1;
}

// Build fixture entries pre-sort — ranked by rankValue DESC, then xp DESC.
// The demo user (currentUserId) is placed at approximately rank 6 in the table.
function buildFixture(currentUserId: string): LeaderboardEntry[] {
  const raw: Omit<LeaderboardEntry, "rank">[] = [
    // Rank 1 candidate — high achiever
    {
      userId: "mock-user-001",
      displayName: "Yuki Tanaka",
      xp: 12000,
      level: xpToLevel(12000),
      achievementCount: 18,
      rankValue: xpToLevel(12000) * 18,
      equippedBorderId: "Border-004",
      equippedBadgeId: "Accent-002",
      equippedAvatarId: "StoreAvatar-003",
    },
    // Rank 2 candidate
    {
      userId: "mock-user-002",
      displayName: "Amara Osei",
      xp: 9800,
      level: xpToLevel(9800),
      achievementCount: 15,
      rankValue: xpToLevel(9800) * 15,
      equippedBorderId: "Border-002",
      equippedBadgeId: null,
      equippedAvatarId: "StoreAvatar-002",
    },
    // Rank 3 candidate
    {
      userId: "mock-user-003",
      displayName: "Priya Sharma",
      xp: 8500,
      level: xpToLevel(8500),
      achievementCount: 14,
      rankValue: xpToLevel(8500) * 14,
      equippedBorderId: "Border-001",
      equippedBadgeId: "Accent-001",
      equippedAvatarId: null,
    },
    // Rank 4 candidate
    {
      userId: "mock-user-004",
      displayName: "Carlos Mendez",
      xp: 7200,
      level: xpToLevel(7200),
      achievementCount: 12,
      rankValue: xpToLevel(7200) * 12,
      equippedBorderId: "Border-003",
      equippedBadgeId: null,
      equippedAvatarId: "StoreAvatar-001",
    },
    // Rank 5 candidate
    {
      userId: "mock-user-005",
      displayName: "Fatima Al-Hassan",
      xp: 5900,
      level: xpToLevel(5900),
      achievementCount: 10,
      rankValue: xpToLevel(5900) * 10,
      equippedBorderId: null,
      equippedBadgeId: "Accent-003",
      equippedAvatarId: "StoreAvatar-002",
    },
    // Demo user — xp=2840, level=12, achievementCount=2, rankValue=24 (rank ~6)
    {
      userId: currentUserId,
      displayName: "Ari Navarro",
      xp: 2840,
      level: xpToLevel(2840), // 12
      achievementCount: 2,
      rankValue: xpToLevel(2840) * 2, // 24
      equippedBorderId: "Border-001",
      equippedBadgeId: null,
      equippedAvatarId: "StoreAvatar-001",
    },
    // Rank 7 candidate
    {
      userId: "mock-user-007",
      displayName: "Lena Müller",
      xp: 3500,
      level: xpToLevel(3500),
      achievementCount: 1,
      rankValue: xpToLevel(3500) * 1,
      equippedBorderId: null,
      equippedBadgeId: null,
      equippedAvatarId: null,
    },
    // Rank 8 candidate
    {
      userId: "mock-user-008",
      displayName: "Omar Diallo",
      xp: 2100,
      level: xpToLevel(2100),
      achievementCount: 3,
      rankValue: xpToLevel(2100) * 3,
      equippedBorderId: "Border-002",
      equippedBadgeId: null,
      equippedAvatarId: null,
    },
    // Rank 9 candidate
    {
      userId: "mock-user-009",
      displayName: "Hana Kim",
      xp: 1800,
      level: xpToLevel(1800),
      achievementCount: 4,
      rankValue: xpToLevel(1800) * 4,
      equippedBorderId: null,
      equippedBadgeId: "Accent-001",
      equippedAvatarId: "StoreAvatar-001",
    },
    // Rank 10 candidate
    {
      userId: "mock-user-010",
      displayName: "Ivan Petrov",
      xp: 2000,
      level: xpToLevel(2000),
      achievementCount: 2,
      rankValue: xpToLevel(2000) * 2,
      equippedBorderId: null,
      equippedBadgeId: null,
      equippedAvatarId: null,
    },
    // Rank 11 candidate
    {
      userId: "mock-user-011",
      displayName: "Sofia Rossi",
      xp: 1200,
      level: xpToLevel(1200),
      achievementCount: 3,
      rankValue: xpToLevel(1200) * 3,
      equippedBorderId: null,
      equippedBadgeId: null,
      equippedAvatarId: "StoreAvatar-001",
    },
    // Rank 12 candidate
    {
      userId: "mock-user-012",
      displayName: "Nguyen Van An",
      xp: 500,
      level: xpToLevel(500),
      achievementCount: 2,
      rankValue: xpToLevel(500) * 2,
      equippedBorderId: null,
      equippedBadgeId: null,
      equippedAvatarId: null,
    },
  ];

  // Sort by rankValue DESC, then xp DESC (matching SQL ORDER BY)
  const sorted = [...raw].sort(
    (a, b) => b.rankValue - a.rankValue || b.xp - a.xp,
  );

  // Assign 1-based rank positions
  return sorted.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
}

export function createMockLeaderboardRepository(
  currentUserId: string,
): LeaderboardRepository {
  const FIXTURE = buildFixture(currentUserId);

  return {
    async getTopN(n: number): Promise<LeaderboardEntry[]> {
      return FIXTURE.slice(0, Math.min(n, FIXTURE.length));
    },

    async getCurrentUserEntry(userId: string): Promise<LeaderboardEntry | null> {
      return FIXTURE.find((e) => e.userId === userId) ?? null;
    },
  };
}
