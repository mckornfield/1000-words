/**
 * Supabase only stores raw lifetime XP — profileLevel/xpToNextLevel (as shown
 * throughout Dashboard/Objectives/Profile) are derived, not stored. The demo
 * fixture hardcodes these instead of computing them, so there's no existing
 * formula to match; this picks a flat 500 XP per level.
 */
export function computeLevelFromXp(xp: number): { profileLevel: number; xpToNextLevel: number } {
  const XP_PER_LEVEL = 500;
  const profileLevel = Math.floor(xp / XP_PER_LEVEL) + 1;
  const xpToNextLevel = profileLevel * XP_PER_LEVEL;
  return { profileLevel, xpToNextLevel };
}
