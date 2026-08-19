// ─────────────────────────────────────────────────────────────────────────────
// Level Utility — Pure formula functions for the SkillUp level progression system.
//
// Formula: Level = floor(xp / XP_PER_LEVEL) + 1
// XP per level is linear and fixed at 100 XP.
//
// This file is the SINGLE SOURCE OF TRUTH for level calculation.
// Do NOT duplicate this formula in any service or controller.
// ─────────────────────────────────────────────────────────────────────────────

/** The amount of XP required to advance one level. */
export const XP_PER_LEVEL = 100;

/**
 * Calculates the user's level based on their total accumulated XP.
 * Level starts at 1 for any XP value from 0 to 99.
 *
 * @param xp - Total accumulated XP (must be >= 0)
 * @returns Current level (integer, minimum 1)
 */
export function calculateLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

/**
 * Returns the minimum XP required to reach the given level.
 *
 * @param level - Target level (must be >= 1)
 * @returns XP threshold for the start of that level
 */
export function getLevelStartXP(level: number): number {
  return (level - 1) * XP_PER_LEVEL;
}

/**
 * Returns the XP required to reach the NEXT level from the given level.
 *
 * @param level - Current level
 * @returns XP threshold for the start of the next level
 */
export function getNextLevelXP(level: number): number {
  return level * XP_PER_LEVEL;
}

/**
 * Returns progress (0.0–1.0) through the current level.
 *
 * @param xp - Total accumulated XP
 * @returns Progress fraction within the current level
 */
export function getLevelProgress(xp: number): number {
  const level = calculateLevel(xp);
  const start = getLevelStartXP(level);
  const xpIntoLevel = xp - start;
  return parseFloat((xpIntoLevel / XP_PER_LEVEL).toFixed(4));
}
