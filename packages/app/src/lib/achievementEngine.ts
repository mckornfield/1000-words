import type { Achievement } from "../data/account/schema";

export interface SessionMetrics {
  cardsReviewed: number;
  accuracy: number;
  xpEarned: number;
  hour: number;
  streakCount: number;
  totalCardsReviewedAllTime: number;
  lessonsCompleted: number;
}

/**
 * Returns IDs of achievements newly unlocked by this session.
 * Pure function — no I/O. Caller persists results via achievementRepo.unlock().
 */
export function checkAchievements(
  catalog: Achievement[],
  earned: Set<string>,
  metrics: SessionMetrics,
): string[] {
  const newlyUnlocked: string[] = [];

  for (const ach of catalog) {
    if (earned.has(ach.achievementId)) continue;
    if (!ach.criteria) continue;

    // Prerequisite gate: parent must be earned first
    if (ach.prerequisiteId && !earned.has(ach.prerequisiteId)) continue;

    const { type, target } = ach.criteria;
    let met = false;

    switch (type) {
      case "xp_total":
        met = metrics.xpEarned >= target;
        break;
      case "streak_days":
        met = metrics.streakCount >= target;
        break;
      case "cards_reviewed_total":
        met = metrics.totalCardsReviewedAllTime >= target;
        break;
      case "lessons_completed":
        met = metrics.lessonsCompleted >= target;
        break;
      case "accuracy_perfect":
        met = metrics.accuracy === 100 && metrics.cardsReviewed > 0;
        break;
      case "time_of_day":
        // "after 10 PM" → hour >= target; "before 8 AM" → hour < target
        met = target >= 20 ? metrics.hour >= target : metrics.hour < target;
        break;
    }

    if (met) {
      newlyUnlocked.push(ach.achievementId);
      earned.add(ach.achievementId);
    }
  }

  return newlyUnlocked;
}
