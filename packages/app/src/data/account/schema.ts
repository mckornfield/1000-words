import { z } from "zod";

export const DemoUserSchema = z.object({
  userId: z.string().regex(/^Usr-\d{3}$/),
  email: z.string().min(1),
  password: z.string().min(1),
  profileId: z.string().regex(/^Prof-\d{3}$/),
  status: z.enum(["active", "disabled"]),
});

export const ProfileSchema = z.object({
  profileId: z.string().regex(/^Prof-\d{3}$/),
  userId: z.string().regex(/^Usr-\d{3}$/),
  displayName: z.string().min(1),
  email: z.string().min(1),
  phone: z.string().min(1),
  avatarBase64: z.string().min(1),
  avatarFallbackText: z.string().min(1),
  profileBannerId: z.string().regex(/^Ban-\d{3}$/),
  profileLevel: z.number().int().nonnegative(),
  xp: z.number().int().nonnegative(),
  tokens: z.number().int().nonnegative(),
  xpToNextLevel: z.number().int().positive(),
  streakDays: z.number().int().nonnegative(),
  joinedDate: z.string().min(1),
  lastActiveDate: z.string().min(1),
  accentId: z.string().regex(/^Acc-\d{3}$/),
  borderId: z.string().regex(/^Bor-\d{3}$/),
  themePreference: z.enum(["light", "dark", "system"]),
  timezone: z.string().min(1),
  bio: z.string().min(1),
});

export const LessonSchema = z.object({
  lessonId: z.string().regex(/^Les-\d{3}$/),
  trackId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  difficulty: z.enum(["starter", "core", "advanced"]),
  xpReward: z.number().int().nonnegative(),
  estimatedMinutes: z.number().int().positive(),
  status: z.enum(["completed", "in_progress", "locked"]),
  completionPercent: z.number().min(0).max(100),
  badgeId: z.string().regex(/^Bad-\d{3}$/),
});

export const AchievementCriteriaSchema = z.object({
  type: z.enum([
    "xp_total",
    "streak_days",
    "cards_reviewed_total",
    "lessons_completed",
    "accuracy_perfect",
    "time_of_day",
  ]),
  target: z.number(),
});

export const AchievementSchema = z.object({
  achievementId: z.string().regex(/^Ach-\d{3}$/),
  title: z.string().min(1),
  description: z.string().min(1),
  xpReward: z.number().int().nonnegative(),
  rarity: z.enum(["common", "rare", "epic", "legendary"]),
  icon: z.string().min(1),
  iconFallback: z.string().min(1),
  status: z.enum(["completed", "in_progress", "locked"]),
  completedAt: z.string().nullable(),
  prerequisiteId: z.string().regex(/^Ach-\d{3}$/).nullable(),
  criteria: AchievementCriteriaSchema.nullable(),
});

export const StoreItemSchema = z.object({
  storeItemId: z.string().regex(/^(StoreAvatar|Border|Accent)-\d{3}$/),
  category: z.enum(["profile_picture", "profile_border", "profile_accent"]),
  name: z.string().min(1),
  description: z.string().min(1),
  priceXp: z.number().int().nonnegative(),
  tokenCost: z.number().int().nonnegative(),
  achievementIdRequired: z.string().regex(/^Ach-\d{3}$/).nullable(),
  assetRefId: z.string().regex(/^Asset-[A-Za-z]+-\d{3}$/),
  emoji: z.string().min(1),
  emojiFallback: z.string().min(1),
  isOwned: z.boolean(),
  isEquipped: z.boolean(),
});

export const DailyGoalSchema = z.object({
  goalId: z.string().regex(/^Goal-\d{3}$/),
  title: z.string().min(1),
  target: z.number().int().positive(),
  progress: z.number().int().nonnegative(),
  xpReward: z.number().int().nonnegative(),
  status: z.enum(["completed", "in_progress", "locked"]),
});

export const ActivityEventSchema = z.object({
  eventId: z.string().regex(/^Evt-\d{3}$/),
  timestamp: z.string().min(1),
  title: z.string().min(1),
  detail: z.string().min(1),
  icon: z.string().min(1),
  iconFallback: z.string().min(1),
});

export const AccountDataSchema = z.object({
  schemaVersion: z.string().min(1),
  users: z.array(DemoUserSchema),
  profiles: z.array(ProfileSchema),
  lessons: z.array(LessonSchema),
  achievements: z.array(AchievementSchema),
  storeItems: z.array(StoreItemSchema),
  dailyGoals: z.array(DailyGoalSchema),
  activityTimeline: z.array(ActivityEventSchema),
});

export type DemoUser = z.infer<typeof DemoUserSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type Achievement = z.infer<typeof AchievementSchema>;
export type AchievementCriteria = z.infer<typeof AchievementCriteriaSchema>;
export type StoreItem = z.infer<typeof StoreItemSchema>;
export type DailyGoal = z.infer<typeof DailyGoalSchema>;
export type ActivityEvent = z.infer<typeof ActivityEventSchema>;
export type AccountData = z.infer<typeof AccountDataSchema>;
