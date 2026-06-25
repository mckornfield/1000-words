import type { Profile } from "../account/schema";
import type { AppProfile, ProfileRepository, UserSettings } from "../types";

export function createMockProfileRepository(fixture: Profile): ProfileRepository {
  let current: AppProfile = {
    userId: fixture.userId,
    displayName: fixture.displayName,
    bio: fixture.bio,
    xp: fixture.xp,
    tokens: fixture.tokens,
    streakCount: fixture.streakDays,
    lastActiveDate: fixture.lastActiveDate,
    settings: {
      themePreference: fixture.themePreference,
      dailyGoalMinutes: 15,
      autoAdvance: false,
      notifications: { streak: true, goalComplete: true, xpMilestone: false },
    },
  };

  return {
    async getProfile(_userId) {
      return { ...current };
    },
    async updateProfile(_userId, patch) {
      if (patch.displayName !== undefined) current = { ...current, displayName: patch.displayName };
      if (patch.bio !== undefined) current = { ...current, bio: patch.bio };
      if (patch.settings !== undefined)
        current = { ...current, settings: patch.settings as UserSettings };
    },
    async addXp(_userId, delta) {
      current = { ...current, xp: Math.max(0, current.xp + delta) };
    },
    async addTokens(_userId, delta) {
      current = { ...current, tokens: Math.max(0, current.tokens + delta) };
    },
    async spendTokens(_userId, amount) {
      if (current.tokens < amount) throw new Error("insufficient_tokens");
      current = { ...current, tokens: current.tokens - amount };
    },
    async touchStreak(_userId, _date) {},
  };
}
