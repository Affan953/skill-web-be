import { AchievementCategory } from './achievements.constants';

// ─────────────────────────────────────────────────────────────────────────────
// Achievement Interface
//
// Represents one achievement document as stored in Firestore under
// users/{uid}/achievements/{achievementId}
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single achievement stored in Firestore for a given user.
 */
export interface Achievement {
  /** Unique string identifier — matches the AchievementDefinition.id */
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  /** Whether the user has unlocked this achievement */
  unlocked: boolean;
  /** ISO timestamp of when the achievement was unlocked; null if still locked */
  unlockedAt: Date | null;
  /** How far the user has progressed toward the target (e.g. 7 out of 10 habits) */
  progress: number;
  /** The value required to unlock this achievement */
  target: number;
}

/**
 * Subset of user statistics consumed by AchievementsService.
 * Extracted into its own interface to avoid importing the entire User model.
 */
export interface UserStats {
  xp: number;
  level: number;
  totalHabits: number;
  currentStreak: number;
}
