import { supabase } from "../../lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
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

export function createSupabaseProfileRepository(injectedClient: SupabaseClient = supabase): ProfileRepository {
  return {
    async getProfile(userId) {
      const { data, error } = await injectedClient
        .from("profiles")
        .select("user_id, display_name, bio, time_zone, settings, streak_count, xp, tokens, last_active_date, created_at")
        .eq("user_id", userId)
        .single();
      if (error) throw error;
      return {
        userId: data.user_id as string,
        displayName: (data.display_name as string | null) ?? "",
        bio: (data.bio as string | null) ?? "",
        xp: (data.xp as number) ?? 0,
        tokens: (data.tokens as number) ?? 0,
        streakCount: (data.streak_count as number) ?? 0,
        lastActiveDate: (data.last_active_date as string | null) ?? null,
        createdAt: (data.created_at as string | null) ?? null,
        timeZone: (data.time_zone as string | null) ?? undefined,
        settings: parseSettings(data.settings),
      } satisfies AppProfile;
    },

    async updateProfile(userId, patch) {
      const updates: Record<string, unknown> = {};
      if (patch.displayName !== undefined) updates.display_name = patch.displayName;
      if (patch.bio !== undefined) updates.bio = patch.bio;
      if (patch.settings !== undefined) updates.settings = patch.settings;
      const { error } = await injectedClient
        .from("profiles")
        .update(updates)
        .eq("user_id", userId);
      if (error) throw error;
    },
  };
}
