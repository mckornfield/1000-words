/**
 * Supabase only stores raw lifetime XP — profileLevel/xpToNextLevel (as shown
 * throughout Dashboard/Objectives/Profile) are derived, not stored. The demo
 * fixture hardcodes these instead of computing them, so there's no existing
 * formula to match; leaderboard and profile projections use one canonical flat
 * threshold so the same lifetime XP always produces the same level.
 */
export const XP_PER_LEVEL = 250;

export function computeLevelFromXp(xp: number): { profileLevel: number; xpToNextLevel: number } {
  const profileLevel = Math.floor(xp / XP_PER_LEVEL) + 1;
  const xpToNextLevel = profileLevel * XP_PER_LEVEL;
  return { profileLevel, xpToNextLevel };
}
