import { supabase } from "../../lib/supabase";
import type { LeaderboardEntry, LeaderboardRepository } from "../types";

// Maps a raw RPC row (snake_case) to a LeaderboardEntry (camelCase).
// achievement_count and rank_value come back from Postgres as bigint,
// which Supabase JS returns as number in JS — no explicit cast needed.
function mapRow(
  row: {
    user_id: string;
    display_name: string;
    xp: number;
    level: number;
    achievement_count: number;
    rank_value: number;
    border_item_id: string | null;
    badge_item_id: string | null;
    avatar_item_id: string | null;
  },
  rank: number,
): LeaderboardEntry {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    xp: row.xp,
    level: row.level,
    achievementCount: Number(row.achievement_count),
    rankValue: Number(row.rank_value),
    rank,
    equippedBorderId: row.border_item_id,
    equippedBadgeId: row.badge_item_id,
    equippedAvatarId: row.avatar_item_id,
  };
}

export function createSupabaseLeaderboardRepository(): LeaderboardRepository {
  return {
    async getTopN(n: number): Promise<LeaderboardEntry[]> {
      const { data, error } = await supabase.rpc("get_leaderboard", { n });
      if (error) throw error;
      return (data ?? []).map(
        (
          row: {
            user_id: string;
            display_name: string;
            xp: number;
            level: number;
            achievement_count: number;
            rank_value: number;
            border_item_id: string | null;
            badge_item_id: string | null;
            avatar_item_id: string | null;
          },
          idx: number,
        ) => mapRow(row, idx + 1),
      );
    },

    async getCurrentUserEntry(userId: string): Promise<LeaderboardEntry | null> {
      const { data, error } = await supabase.rpc("get_current_user_rank", {
        uid: userId,
      });
      if (error) throw error;
      if (!data || (Array.isArray(data) && data.length === 0)) return null;
      const row = Array.isArray(data) ? data[0] : data;
      // rank is -1 as a sentinel when the user is outside the top-N window.
      // The UI component shows a "You" label without a rank number in that case.
      return mapRow(row, -1);
    },
  };
}
