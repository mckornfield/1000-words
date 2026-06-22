import type { DailyXp, StatsRepository } from "../types";

export function createMockStatsRepository(): StatsRepository {
  return {
    async getWeeklyXp(_userId, _since) {
      const days: DailyXp[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86_400_000);
        days.push({
          date: d.toISOString().slice(0, 10),
          xp: Math.floor(Math.random() * 500) + 100,
        });
      }
      return days;
    },
  };
}
