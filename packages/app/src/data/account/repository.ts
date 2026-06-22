import rawAccountData from "./mock/demo-account-data.json";
import {
  AccountDataSchema,
  type AccountData,
  type Achievement,
  type ActivityEvent,
  type DailyGoal,
  type DemoUser,
  type Lesson,
  type Profile,
  type StoreItem,
} from "./schema";

// Re-export types for convenience
export type { Lesson, Achievement, StoreItem, DailyGoal, ActivityEvent, Profile, DemoUser };

// ─── Data types ───────────────────────────────────────────────────────────────

/**
 * The full payload required to render the student dashboard.
 * All arrays correspond to the active user's data slice.
 */
export interface DashboardData {
  user: DemoUser;
  profile: Profile;
  lessons: Lesson[];
  achievements: Achievement[];
  storeItems: StoreItem[];
  dailyGoals: DailyGoal[];
  activityTimeline: ActivityEvent[];
}

/**
 * Backend-agnostic interface for account data access.
 * Swap localAccountRepository for a Supabase implementation without touching
 * any UI code — the interface remains the contract.
 */
export interface AccountRepository {
  /**
   * Returns the DemoUser matching the given credentials, or null if not found.
   * Does not throw on a miss — callers decide how to handle a null result.
   */
  findUserByCredentials(email: string, password: string): DemoUser | null;
  /**
   * Returns the full dashboard payload for the given userId.
   * Throws a descriptive Error if the userId or its associated profile is missing.
   */
  getDashboardData(userId: string): DashboardData;
  /**
   * Converts the profile's Base64-encoded avatar into a data URI suitable for <img src>.
   * Avatar is stored as Base64 to mirror future blob-storage semantics locally.
   */
  decodeProfileAvatar(profile: Profile): string;
}

// ─── Fixture loading ──────────────────────────────────────────────────────────
// Validate the JSON fixture against the Zod schema at module load time.
// A schema mismatch here means the fixture is out of sync with the TypeScript
// types — the error message will identify which field failed validation.
let accountData: AccountData;
try {
  accountData = AccountDataSchema.parse(rawAccountData);
} catch (err) {
  // Surface a human-readable message instead of a raw Zod stack trace.
  const detail = err instanceof Error ? err.message : String(err);
  throw new Error(
    `[AccountRepository] demo-account-data.json failed schema validation.\n` +
    `This usually means the fixture is missing a required field or uses the wrong format.\n` +
    `Validation error:\n${detail}`,
    { cause: err },
  );
}

// ─── Local adapter ────────────────────────────────────────────────────────────

export const localAccountRepository: AccountRepository = {
  findUserByCredentials(email, password) {
    const user =
      accountData.users.find((u) => u.email === email && u.password === password) ?? null;
    if (!user) {
      console.debug(
        `[AccountRepository] findUserByCredentials: no match for email="${email}"`,
      );
    }
    return user;
  },

  getDashboardData(userId) {
    const user = accountData.users.find((u) => u.userId === userId);
    if (!user) {
      throw new Error(
        `[AccountRepository] getDashboardData: no user found with userId="${userId}". ` +
        `Check that the session userId matches an entry in demo-account-data.json.`,
      );
    }

    const profile = accountData.profiles.find((p) => p.profileId === user.profileId);
    if (!profile) {
      throw new Error(
        `[AccountRepository] getDashboardData: no profile found with profileId="${user.profileId}" ` +
        `for userId="${userId}". Check that the profileId foreign key is consistent in the fixture.`,
      );
    }

    return {
      user,
      profile,
      lessons: accountData.lessons,
      achievements: accountData.achievements,
      storeItems: accountData.storeItems,
      dailyGoals: accountData.dailyGoals,
      activityTimeline: accountData.activityTimeline,
    };
  },

  decodeProfileAvatar(profile) {
    // Avatar is stored as raw Base64 (not a data URI) in the fixture to mirror
    // the expected format of a future blob-storage API response.
    if (!profile.avatarBase64) {
      console.warn(
        `[AccountRepository] decodeProfileAvatar: avatarBase64 is empty for profileId="${profile.profileId}". Returning empty string.`,
      );
      return "";
    }
    return `data:image/svg+xml;base64,${profile.avatarBase64}`;
  },
};
