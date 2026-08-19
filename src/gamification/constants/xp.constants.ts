import { HabitDifficulty } from '../../habits/habits.interface';

// ─────────────────────────────────────────────────────────────────────────────
// XP Reward Constants
// Single source of truth for all XP reward values in the application.
// ─────────────────────────────────────────────────────────────────────────────

export const XP_REWARDS = {
  Easy: 10,
  Medium: 20,
  Hard: 30,
} as const;

export const XP_REWARD_MAP: Record<HabitDifficulty, number> = {
  [HabitDifficulty.Easy]: XP_REWARDS.Easy,
  [HabitDifficulty.Medium]: XP_REWARDS.Medium,
  [HabitDifficulty.Hard]: XP_REWARDS.Hard,
};
