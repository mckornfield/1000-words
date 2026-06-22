import { supabase } from "../../lib/supabase";
import type { AchievementRepository, UserAchievement } from "../types";

export function createSupabaseAchievementRepository(): AchievementRepository {
  return {
    async getUserAchievements(userId) {
      const { data, error } = await supabase
        .from("user_achievements")
        .select("achievement_id, earned_at")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        achievementId: r.achievement_id as string,
        earnedAt: r.earned_at as string,
      })) satisfies UserAchievement[];
    },

    async unlock(userId, achievementId) {
      const { error } = await supabase
        .from("user_achievements")
        .insert({ user_id: userId, achievement_id: achievementId });
      // Ignore duplicate-key errors (idempotent unlock)
      if (error && !error.message.includes("duplicate")) throw error;
    },
  };
}
