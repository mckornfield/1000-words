import { supabase } from "../../lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailyGoalRecord, DailyGoalRepository } from "../types";


export function createSupabaseDailyGoalRepository(client: SupabaseClient = supabase): DailyGoalRepository {
  return {
    async getTodayGoals(userId) {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await client
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
  };
}
