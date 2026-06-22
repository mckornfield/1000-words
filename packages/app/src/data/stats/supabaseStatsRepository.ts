import { supabase } from "../../lib/supabase";
import type { DailyXp, StatsRepository } from "../types";

// rating → approximate XP contribution
const RATING_XP: Record<number, number> = { 1: 0, 2: 5, 3: 10, 4: 15 };

export function createSupabaseStatsRepository(): StatsRepository {
  return {
    async getWeeklyXp(userId, since) {
      const { data, error } = await supabase
        .from("review_logs")
        .select("reviewed_at, rating")
        .eq("user_id", userId)
        .gte("reviewed_at", since);
      if (error) throw error;

      const byDate: Record<string, number> = {};
      for (const row of data ?? []) {
        const date = (row.reviewed_at as string).slice(0, 10);
        byDate[date] = (byDate[date] ?? 0) + (RATING_XP[row.rating as number] ?? 0);
      }

      // Return last 7 days, filling gaps with 0
      const result: DailyXp[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86_400_000);
        const date = d.toISOString().slice(0, 10);
        result.push({ date, xp: byDate[date] ?? 0 });
      }
      return result;
    },
  };
}
