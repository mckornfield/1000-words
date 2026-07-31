import type { Profile } from "../account/schema";
import type { AppProfile, ProfileRepository, UserSettings } from "../types";

export interface MutableProfileState {
  current: AppProfile;
}

export function createMockProfileState(fixture: Profile): MutableProfileState {
  return {
    current: {
      userId: fixture.userId,
      displayName: fixture.displayName,
      bio: fixture.bio,
      xp: fixture.xp,
      tokens: fixture.tokens,
      streakCount: fixture.streakDays,
      lastActiveDate: fixture.lastActiveDate,
      createdAt: fixture.joinedDate,
      timeZone: fixture.timezone,
      settings: {
        themePreference: fixture.themePreference,
        dailyGoalMinutes: 15,
        autoAdvance: false,
        notifications: { streak: true, goalComplete: true, xpMilestone: false },
      },
    },
  };
}

export function createMockProfileRepository(
  fixture: Profile,
  state: MutableProfileState = createMockProfileState(fixture),
): ProfileRepository {
  return {
    async getProfile(_userId) {
      return structuredClone(state.current);
    },
    async updateProfile(_userId, patch) {
      if (patch.displayName !== undefined) state.current = { ...state.current, displayName: patch.displayName };
      if (patch.bio !== undefined) state.current = { ...state.current, bio: patch.bio };
      if (patch.settings !== undefined) {
        state.current = { ...state.current, settings: patch.settings as UserSettings };
      }
    },
  };
}
