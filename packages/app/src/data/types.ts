import type { ProgressStore } from "./progressStore";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthSession {
  userId: string;
  email: string;
}

export interface AuthRepository {
  getSession(): Promise<AuthSession | null>;
  signIn(email: string, password: string): Promise<AuthSession>;
  signOut(): Promise<void>;
  onAuthChange(cb: (session: AuthSession | null) => void): () => void;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export interface UserSettings {
  themePreference: "light" | "dark" | "system";
  dailyGoalMinutes: number;
  autoAdvance: boolean;
  notifications: {
    streak: boolean;
    goalComplete: boolean;
    xpMilestone: boolean;
  };
}

export interface AppProfile {
  userId: string;
  displayName: string;
  bio: string;
  xp: number;
  tokens: number;
  streakCount: number;
  lastActiveDate: string | null;
  settings: UserSettings;
}

export interface ProfileRepository {
  getProfile(userId: string): Promise<AppProfile>;
  updateProfile(
    userId: string,
    patch: Partial<Pick<AppProfile, "displayName" | "bio" | "settings">>,
  ): Promise<void>;
  addXp(userId: string, delta: number): Promise<void>;
  addTokens(userId: string, delta: number): Promise<void>;
  spendTokens(userId: string, amount: number): Promise<void>;
  touchStreak(userId: string, date: string): Promise<void>;
}

// ─── Achievements ─────────────────────────────────────────────────────────────

export interface UserAchievement {
  achievementId: string;
  earnedAt: string;
}

export interface AchievementRepository {
  getUserAchievements(userId: string): Promise<UserAchievement[]>;
  unlock(userId: string, achievementId: string): Promise<void>;
}

// ─── Inventory + Equip ────────────────────────────────────────────────────────

export type EquipSlot = "profile_picture" | "profile_border" | "profile_accent";

export interface UserInventoryRecord {
  itemId: string;
  purchasedAt: string;
}

export interface UserEquippedRecord {
  slot: EquipSlot;
  itemId: string;
}

export interface InventoryRepository {
  getInventory(userId: string): Promise<UserInventoryRecord[]>;
  getEquipped(userId: string): Promise<UserEquippedRecord[]>;
  purchase(userId: string, itemId: string, xpCost: number): Promise<void>;
  equip(userId: string, slot: EquipSlot, itemId: string): Promise<void>;
}

// ─── Daily Goals ─────────────────────────────────────────────────────────────

export interface DailyGoalRecord {
  goalType: string;
  target: number;
  current: number;
  goalDate: string;
}

export interface DailyGoalRepository {
  getTodayGoals(userId: string): Promise<DailyGoalRecord[]>;
  incrementGoal(userId: string, goalType: string, by: number): Promise<void>;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface DailyXp {
  date: string;
  xp: number;
}

export interface StatsRepository {
  getWeeklyXp(userId: string, since: string): Promise<DailyXp[]>;
}

// ─── App Context ──────────────────────────────────────────────────────────────

export interface AppContextValue {
  userId: string;
  progressStore: ProgressStore;
  profileRepo: ProfileRepository;
  achievementRepo: AchievementRepository;
  inventoryRepo: InventoryRepository;
  goalRepo: DailyGoalRepository;
  statsRepo: StatsRepository;
}
