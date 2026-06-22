import { supabase } from "../../lib/supabase";
import type { DailyGoalRecord, DailyGoalRepository } from "../types";

// Default targets for each goal type (used when inserting a new day's row).
const DEFAULT_TARGETS: Record<string, number> = {
  cards_reviewed: 20,
  minutes_studied: 15,
  lessons_completed: 1,
};

export function createSupabaseDailyGoalRepository(): DailyGoalRepository {
  return {
    async getTodayGoals(userId) {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("user_daily_goals")
        .select("goal_type, target, current, goal_date")
        .eq("user_id", userId)
        .eq("goal_date", today);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        goalType: r.goal_type as string,
        target: r.target as number,
        current: r.current as number,
        goalDate: r.goal_date as string,
      })) satisfies DailyGoalRecord[];
    },

    async incrementGoal(userId, goalType, by) {
      const today = new Date().toISOString().slice(0, 10);
      // Try update first; if no row exists, insert one.
      const { data: existing } = await supabase
        .from("user_daily_goals")
        .select("current")
        .eq("user_id", userId)
        .eq("goal_date", today)
        .eq("goal_type", goalType)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("user_daily_goals")
          .update({ current: (existing.current as number) + by })
          .eq("user_id", userId)
          .eq("goal_date", today)
          .eq("goal_type", goalType);
      } else {
        await supabase.from("user_daily_goals").insert({
          user_id: userId,
          goal_date: today,
          goal_type: goalType,
          target: DEFAULT_TARGETS[goalType] ?? 10,
          current: by,
        });
      }
    },
  };
}
