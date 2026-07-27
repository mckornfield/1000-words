import type { ProgressStore } from "./progressStore";
import type { DashboardData } from "./account/repository";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthSession {
  userId: string;
  email: string;
}

export interface AuthRepository {
  getSession(): Promise<AuthSession | null>;
  signUp(email: string, password: string): Promise<AuthSession>;
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
  createdAt: string | null;
  timeZone?: string;
  settings: UserSettings;
}

export interface ProfileRepository {
  getProfile(userId: string): Promise<AppProfile>;
  updateProfile(
    userId: string,
    patch: Partial<Pick<AppProfile, "displayName" | "bio" | "settings">>,
  ): Promise<void>;
}

// ─── Achievements ─────────────────────────────────────────────────────────────

export interface UserAchievement {
  achievementId: string;
  earnedAt: string;
}

export interface AchievementRepository {
  getUserAchievements(userId: string): Promise<UserAchievement[]>;
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

export interface PurchaseItemCommand {
  itemId: string;
  requestId: string;
}

export interface PurchaseItemResult {
  requestId: string;
  itemId: string;
  tokenCost: number;
  balance: number;
  inventoryRecord: UserInventoryRecord;
  status: "purchased" | "already_owned";
  replayed: boolean;
}

export interface EquipItemCommand {
  itemId: string;
  requestId: string;
}

export interface EquipItemResult {
  requestId: string;
  itemId: string;
  equipped: UserEquippedRecord;
  replacedItemId: string | null;
  replayed: boolean;
}

export interface InventoryRepository {
  getInventory(userId: string): Promise<UserInventoryRecord[]>;
  getEquipped(userId: string): Promise<UserEquippedRecord[]>;
  purchase(command: PurchaseItemCommand): Promise<PurchaseItemResult>;
  equip(command: EquipItemCommand): Promise<EquipItemResult>;
}

// ─── Atomic Study Commands ────────────────────────────────────────────────────

export interface RecordCardReviewCommand {
  reviewId: string;
  sessionId: string;
  langPair: import("@1000words/content").LangPair;
  cardId: string;
  rating: import("@1000words/engine").Rating;
  elapsedMs: number;
  nextState: import("@1000words/engine").FsrsState;
}

export interface RecordedCardReview {
  reviewId: string;
  sessionId: string;
  cardId: string;
  rating: import("@1000words/engine").Rating;
  reviewedAt: string;
  progress: import("@1000words/engine").FsrsState;
  replayed: boolean;
}

export interface CompleteStudySessionCommand {
  sessionId: string;
  langPair: import("@1000words/content").LangPair;
  startedAt: string;
  completedAt: string;
}

export interface LearningTotals {
  cardsReviewed: number;
  sessionsCompleted: number;
  minutesStudied: number;
  perfectSessions: number;
}

export interface StudyCompletionResult {
  sessionId: string;
  completedAt: string;
  localStudyDate: string;
  cardsReviewed: number;
  durationSeconds: number;
  accuracy: number;
  reviewXp: number;
  achievementXp: number;
  totalXpAwarded: number;
  profile: AppProfile;
  goals: DailyGoalRecord[];
  totals: LearningTotals;
  unlockedAchievements: UserAchievement[];
  replayed: boolean;
}

export interface StudyRepository {
  recordCardReview(command: RecordCardReviewCommand): Promise<RecordedCardReview>;
  completeStudySession(command: CompleteStudySessionCommand): Promise<StudyCompletionResult>;
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
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface DailyXp {
  date: string;
  xp: number;
}

export interface StatsRepository {
  getWeeklyXp(userId: string, since: string): Promise<DailyXp[]>;
}

// --- Leaderboard ---

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  xp: number;
  level: number;
  achievementCount: number;
  rankValue: number;
  /** 1-based position assigned client-side after fetch (or -1 when rank is unknown) */
  rank: number;
  equippedBorderId: string | null;
  equippedBadgeId: string | null;
  equippedAvatarId: string | null;
}

export interface LeaderboardRepository {
  getTopN(n: number): Promise<LeaderboardEntry[]>;
  getCurrentUserEntry(userId: string): Promise<LeaderboardEntry | null>;
}

export type AppMode = "demo" | "supabase";

export interface Clock {
  now(): Date;
}

export interface StaticCatalog {
  lessons: DashboardData["lessons"];
  achievements: DashboardData["achievements"];
  storeItems: DashboardData["storeItems"];
}

export interface AppServices {
  readonly mode: AppMode;
  readonly userId: string;
  readonly catalog: StaticCatalog;
  readonly progressStore: ProgressStore;
  readonly studyRepo: StudyRepository;
  readonly profileRepo: ProfileRepository;
  readonly achievementRepo: AchievementRepository;
  readonly inventoryRepo: InventoryRepository;
  readonly goalRepo: DailyGoalRepository;
  readonly statsRepo: StatsRepository;
  readonly leaderboardRepo: LeaderboardRepository;
  dispose(): void;
  resetDemoData?(): Promise<void>;
}

export type RefreshDomain =
  | "profile"
  | "goals"
  | "achievements"
  | "inventory"
  | "equipped"
  | "stats"
  | "leaderboard";

export interface UserStateSnapshot {
  profile: AppProfile | null;
  goals: DailyGoalRecord[];
  achievements: UserAchievement[];
  inventory: UserInventoryRecord[];
  equipped: UserEquippedRecord[];
  stats: DailyXp[];
  leaderboard: { entries: LeaderboardEntry[]; currentUser: LeaderboardEntry | null };
}

export interface RefreshState {
  snapshot: UserStateSnapshot;
  pending: ReadonlySet<RefreshDomain>;
  errors: Partial<Record<RefreshDomain, Error>>;
  versions: Readonly<Record<RefreshDomain, number>>;
}

export interface RefreshCoordinator {
  getState(): RefreshState;
  subscribe(listener: () => void): () => void;
  refresh(domains: readonly RefreshDomain[]): Promise<void>;
  patch(patch: Partial<UserStateSnapshot>): void;
  invalidate(domains: readonly RefreshDomain[]): void;
  dispose(): void;
}

// ─── App Context ──────────────────────────────────────────────────────────────

export interface AppContextValue {
  userId: string;
  services: AppServices;
  coordinator: RefreshCoordinator;
  state: RefreshState;
  refresh(domains: readonly RefreshDomain[]): Promise<void>;
  patchSnapshot(patch: Partial<UserStateSnapshot>): void;
  progressStore: ProgressStore;
  studyRepo: StudyRepository;
  profileRepo: ProfileRepository;
  achievementRepo: AchievementRepository;
  inventoryRepo: InventoryRepository;
  goalRepo: DailyGoalRepository;
  statsRepo: StatsRepository;
  leaderboardRepo: LeaderboardRepository;
}
