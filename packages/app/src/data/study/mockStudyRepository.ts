import type {
  AppProfile,
  CompleteStudySessionCommand,
  RecordCardReviewCommand,
  RecordedCardReview,
  StudyCompletionResult,
  StudyRepository,
  DailyGoalRecord,
} from "../types";
import type { Achievement } from "../account/schema";
import type { MutableAchievementState } from "../achievements/mockAchievementRepository";
import { checkAchievements } from "../../lib/achievementEngine";

interface Options {
  userId: string;
  now?: () => Date;
  profile?: AppProfile;
  profileState?: { current: AppProfile };
  achievementCatalog?: Achievement[];
  achievementState?: MutableAchievementState;
  lessonsCompleted?: number;
  onReviewRecorded?: (command: RecordCardReviewCommand) => Promise<void> | void;
  applySessionGoals?: (metrics: { cardsReviewed: number; xpEarned: number; sessionsCompleted: number; streakCount: number }, date: string) => DailyGoalRecord[];
}

const ratingXp = { again: 0, hard: 5, good: 10, easy: 15 } as const;

function localDateInTimeZone(iso: string, timeZone = "UTC"): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function sameReview(a: RecordCardReviewCommand, b: RecordCardReviewCommand): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function createMockStudyRepository(options: Options): StudyRepository {
  const now = options.now ?? (() => new Date());
  const reviews = new Map<string, { command: RecordCardReviewCommand; result: RecordedCardReview }>();
  const completions = new Map<string, { command: CompleteStudySessionCommand; result: StudyCompletionResult }>();
  const profileState = options.profileState ?? { current: options.profile ?? {
    userId: options.userId,
    displayName: "Demo Learner",
    bio: "",
    xp: 0,
    tokens: 0,
    streakCount: 0,
    lastActiveDate: null,
    createdAt: null,
    timeZone: "UTC",
    settings: {
      themePreference: "system",
      dailyGoalMinutes: 15,
      autoAdvance: false,
      notifications: { streak: true, goalComplete: true, xpMilestone: false },
    },
  } };
  const totals = { cardsReviewed: 0, sessionsCompleted: 0, minutesStudied: 0, perfectSessions: 0 };

  return {
    async recordCardReview(command) {
      const prior = reviews.get(command.reviewId);
      if (prior) {
        if (!sameReview(prior.command, command)) throw new Error("idempotency_conflict");
        return { ...prior.result, replayed: true };
      }
      if (completions.has(command.sessionId)) {
        throw new Error("session_completed");
      }
      const result: RecordedCardReview = {
        reviewId: command.reviewId,
        sessionId: command.sessionId,
        cardId: command.cardId,
        rating: command.rating,
        reviewedAt: now().toISOString(),
        progress: command.nextState,
        replayed: false,
      };
      await options.onReviewRecorded?.(command);
      reviews.set(command.reviewId, { command: structuredClone(command), result });
      return result;
    },

    async completeStudySession(command: CompleteStudySessionCommand) {
      const prior = completions.get(command.sessionId);
      if (prior) {
        if (JSON.stringify(prior.command) !== JSON.stringify(command)) throw new Error("idempotency_conflict");
        return { ...structuredClone(prior.result), replayed: true };
      }
      const sessionReviews = [...reviews.values()].filter(({ command: review }) => review.sessionId === command.sessionId);
      if (sessionReviews.length === 0) throw new Error("empty_session");
      if (sessionReviews.some(({ command: review }) => review.langPair !== command.langPair)) throw new Error("session_language_mismatch");
      const started = new Date(command.startedAt).getTime();
      const completed = new Date(command.completedAt).getTime();
      if (!Number.isFinite(started) || !Number.isFinite(completed) || completed < started || completed - started > 4 * 60 * 60 * 1000) {
        throw new Error("invalid_session_duration");
      }
      const durationSeconds = Math.floor((completed - started) / 1000);
      const correct = sessionReviews.filter(({ command: review }) => review.rating === "good" || review.rating === "easy").length;
      const accuracy = Math.round((correct / sessionReviews.length) * 100);
      const reviewXp = sessionReviews.reduce((sum, { command: review }) => sum + ratingXp[review.rating], 0);
      const profile = profileState.current;
      const localStudyDate = localDateInTimeZone(command.completedAt, profile.timeZone);
      const previousDate = profile.lastActiveDate;
      const dayMs = 86_400_000;
      const dayDiff = previousDate ? Math.round((Date.parse(localStudyDate) - Date.parse(previousDate)) / dayMs) : null;
      const streakCount = previousDate === null ? 1 : dayDiff === 1 ? profile.streakCount + 1 : dayDiff !== null && dayDiff > 1 ? 1 : profile.streakCount;
      totals.cardsReviewed += sessionReviews.length;
      totals.sessionsCompleted += 1;
      totals.minutesStudied += Math.floor(durationSeconds / 60);
      if (accuracy === 100) totals.perfectSessions += 1;
      const earned = new Set(options.achievementState?.earned.keys() ?? []);
      const unlockedIds = checkAchievements(options.achievementCatalog ?? [], earned, {
        cardsReviewed: sessionReviews.length,
        accuracy,
        xpEarned: profile.xp + reviewXp,
        hour: new Date(command.completedAt).getUTCHours(),
        streakCount,
        totalCardsReviewedAllTime: totals.cardsReviewed,
        lessonsCompleted: options.lessonsCompleted ?? 0,
      });
      const unlockedAt = now().toISOString();
      const unlockedAchievements = unlockedIds.map((achievementId) => ({ achievementId, earnedAt: unlockedAt }));
      for (const unlocked of unlockedAchievements) options.achievementState?.earned.set(unlocked.achievementId, unlocked.earnedAt);
      const achievementXp = unlockedIds.reduce(
        (sum, achievementId) => sum + (options.achievementCatalog?.find((item) => item.achievementId === achievementId)?.xpReward ?? 0),
        0,
      );
      profileState.current = {
        ...profile,
        xp: profile.xp + reviewXp + achievementXp,
        streakCount,
        lastActiveDate: localStudyDate,
      };
      const goals = options.applySessionGoals?.({
        cardsReviewed: sessionReviews.length,
        xpEarned: reviewXp + achievementXp,
        sessionsCompleted: 1,
        streakCount,
      }, localStudyDate) ?? [];
      const result: StudyCompletionResult = {
        sessionId: command.sessionId,
        completedAt: command.completedAt,
        localStudyDate,
        cardsReviewed: sessionReviews.length,
        durationSeconds,
        accuracy,
        reviewXp,
        achievementXp,
        totalXpAwarded: reviewXp + achievementXp,
        profile: structuredClone(profileState.current),
        goals,
        totals: { ...totals },
        unlockedAchievements,
        replayed: false,
      };
      completions.set(command.sessionId, { command: structuredClone(command), result: structuredClone(result) });
      return result;
    },
  };
}
