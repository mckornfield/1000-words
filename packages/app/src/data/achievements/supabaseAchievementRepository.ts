import { supabase } from "../../lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AchievementRepository, UserAchievement } from "../types";

export function createSupabaseAchievementRepository(client: SupabaseClient = supabase): AchievementRepository {
  return {
    async getUserAchievements(userId) {
      const { data, error } = await client
        .from("user_achievements")
        .select("achievement_id, earned_at")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        achievementId: r.achievement_id as string,
        earnedAt: r.earned_at as string,
      })) satisfies UserAchievement[];
    },
  };
}
