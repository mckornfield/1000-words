import { z } from "zod";

export const FsrsStateSchema = z.object({
  due: z.string(),
  stability: z.number(),
  difficulty: z.number(),
  elapsedDays: z.number(),
  scheduledDays: z.number(),
  learningSteps: z.number().int(),
  reps: z.number().int(),
  lapses: z.number().int(),
  state: z.number().int(),
  lastReview: z.string().nullable(),
});

const SettingsSchema = z.object({
  themePreference: z.enum(["light", "dark", "system"]),
  dailyGoalMinutes: z.number().int(),
  autoAdvance: z.boolean(),
  notifications: z.object({ streak: z.boolean(), goalComplete: z.boolean(), xpMilestone: z.boolean() }),
});

export const AppProfileSchema = z.object({
  userId: z.string(), displayName: z.string(), bio: z.string(), xp: z.number().int().nonnegative(),
  tokens: z.number().int().nonnegative(), streakCount: z.number().int().nonnegative(), lastActiveDate: z.string().nullable(),
  createdAt: z.string().nullable(), timeZone: z.string().optional(), settings: SettingsSchema,
});
export const DailyGoalRecordSchema = z.object({ goalType: z.string(), target: z.number().int(), current: z.number().int(), goalDate: z.string() });
export const UserAchievementSchema = z.object({ achievementId: z.string(), earnedAt: z.string() });

export const RecordedCardReviewSchema = z.object({
  reviewId: z.string().uuid(), sessionId: z.string().uuid(), cardId: z.string(), rating: z.enum(["again", "hard", "good", "easy"]),
  reviewedAt: z.string(), progress: FsrsStateSchema, replayed: z.boolean(),
});

export const StudyCompletionResultSchema = z.object({
  sessionId: z.string().uuid(), completedAt: z.string(), localStudyDate: z.string(), cardsReviewed: z.number().int().nonnegative(),
  durationSeconds: z.number().int().nonnegative(), accuracy: z.number().int().min(0).max(100), reviewXp: z.number().int().nonnegative(),
  achievementXp: z.number().int().nonnegative(), totalXpAwarded: z.number().int().nonnegative(), profile: AppProfileSchema,
  goals: z.array(DailyGoalRecordSchema), totals: z.object({ cardsReviewed: z.number().int().nonnegative(), sessionsCompleted: z.number().int().nonnegative(), minutesStudied: z.number().int().nonnegative(), perfectSessions: z.number().int().nonnegative() }),
  unlockedAchievements: z.array(UserAchievementSchema), replayed: z.boolean(),
});

export const PurchaseItemResultSchema = z.object({
  requestId: z.string().uuid(), itemId: z.string(), tokenCost: z.number().int().nonnegative(), balance: z.number().int().nonnegative(),
  inventoryRecord: z.object({ itemId: z.string(), purchasedAt: z.string() }), status: z.enum(["purchased", "already_owned"]), replayed: z.boolean(),
});
export const EquipItemResultSchema = z.object({
  requestId: z.string().uuid(),
  itemId: z.string(),
  equipped: z.object({ slot: z.enum(["profile_picture", "profile_border", "profile_accent"]), itemId: z.string() }),
  replacedItemId: z.string().nullable(),
  replayed: z.boolean(),
});
