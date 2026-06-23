import { supabase } from "../../lib/supabase";
import type { AppProfile, ProfileRepository, UserSettings } from "../types";

const DEFAULT_SETTINGS: UserSettings = {
  themePreference: "system",
  dailyGoalMinutes: 15,
  autoAdvance: false,
  notifications: { streak: true, goalComplete: true, xpMilestone: false },
};

function parseSettings(raw: unknown): UserSettings {
  if (typeof raw !== "object" || raw === null) return DEFAULT_SETTINGS;
  const s = raw as Record<string, unknown>;
  const n = (s.notifications ?? {}) as Record<string, unknown>;
  return {
    themePreference: (["light", "dark", "system"].includes(s.themePreference as string)
      ? s.themePreference
      : DEFAULT_SETTINGS.themePreference) as UserSettings["themePreference"],
    dailyGoalMinutes:
      typeof s.dailyGoalMinutes === "number"
        ? s.dailyGoalMinutes
        : DEFAULT_SETTINGS.dailyGoalMinutes,
    autoAdvance:
      typeof s.autoAdvance === "boolean" ? s.autoAdvance : DEFAULT_SETTINGS.autoAdvance,
    notifications: {
      streak: n.streak !== false,
      goalComplete: n.goalComplete !== false,
      xpMilestone: n.xpMilestone === true,
    },
  };
}

export function createSupabaseProfileRepository(): ProfileRepository {
  return {
    async getProfile(userId) {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, settings, streak_count, xp, tokens, last_active_date")
        .eq("user_id", userId)
        .single();
      if (error) throw error;
      return {
        userId: data.user_id as string,
        displayName: (data.display_name as string | null) ?? "",
        bio: "",
        xp: (data.xp as number) ?? 0,
        tokens: (data.tokens as number) ?? 0,
        streakCount: (data.streak_count as number) ?? 0,
        lastActiveDate: (data.last_active_date as string | null) ?? null,
        settings: parseSettings(data.settings),
      } satisfies AppProfile;
    },

    async updateProfile(userId, patch) {
      const updates: Record<string, unknown> = {};
      if (patch.displayName !== undefined) updates.display_name = patch.displayName;
      if (patch.bio !== undefined) updates.bio = patch.bio;
      if (patch.settings !== undefined) updates.settings = patch.settings;
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", userId);
      if (error) throw error;
    },

    async addXp(userId, delta) {
      const { error } = await supabase.rpc("increment_xp", { uid: userId, delta });
      if (error) throw error;
    },

    async addTokens(userId, amount) {
      const { error } = await supabase.rpc("add_tokens", { uid: userId, amount });
      if (error) throw error;
    },

    async spendTokens(userId, amount) {
      const { error } = await supabase.rpc("spend_tokens", { uid: userId, amount });
      if (error) throw error;
    },

    async touchStreak(userId, date) {
      const { error } = await supabase
        .from("profiles")
        .update({ last_active_date: date })
        .eq("user_id", userId);
      if (error) throw error;
    },
  };
}
