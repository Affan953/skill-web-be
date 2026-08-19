import { startOfYesterday, toDate } from './date.util';

// ─────────────────────────────────────────────────────────────────────────────
// Streak Utility — Pure helper types and interfaces for streak calculation.
// These are plain data types with no Firestore or NestJS dependencies.
// ─────────────────────────────────────────────────────────────────────────────

export interface HabitStreakInput {
  /** The current streak count stored on the habit document. */
  currentStreak: number;
  /** The last time the habit was completed (Firestore Timestamp, Date, or null). */
  lastCompletedAt: any;
}

export interface UserStreakInput {
  /** The user's current day streak count. */
  currentStreak: number;
  /** The user's longest streak ever recorded. */
  longestStreak: number;
  /** The last time ANY habit was completed by the user (Firestore Timestamp, Date, or null). */
  lastHabitCompletedAt: any;
}

export interface StreakResult {
  newCurrentStreak: number;
  newLongestStreak: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// calculateHabitStreak
//
// Determines the new streak count for a specific habit being completed right now.
// Rules:
//   - If last completed yesterday → increment streak by 1
//   - If last completed before yesterday → reset to 1 (gap detected)
//   - If never completed before → start at 1
// ─────────────────────────────────────────────────────────────────────────────

export function calculateHabitStreak(input: HabitStreakInput): number {
  const yesterday = startOfYesterday();
  const lastCompleted = toDate(input.lastCompletedAt);

  if (!lastCompleted) {
    // First-ever completion
    return 1;
  }

  lastCompleted.setHours(0, 0, 0, 0);

  if (lastCompleted.getTime() === yesterday.getTime()) {
    // Completed yesterday → continue streak
    return input.currentStreak + 1;
  }

  if (lastCompleted.getTime() < yesterday.getTime()) {
    // Gap detected → reset
    return 1;
  }

  // Same day edge case (already completed today — caller should prevent this)
  return input.currentStreak;
}

// ─────────────────────────────────────────────────────────────────────────────
// calculateUserStreak
//
// Determines the user's updated currentStreak and longestStreak values
// based on when they last completed any habit.
// Rules:
//   - If last completion was yesterday → increment current streak
//   - If last completion was before yesterday → reset to 1
//   - If never completed before → start at 1
//   - If last completion was today → keep streak unchanged (another habit today)
//   - longestStreak is updated if currentStreak exceeds it
// ─────────────────────────────────────────────────────────────────────────────

export function calculateUserStreak(input: UserStreakInput): StreakResult {
  const yesterday = startOfYesterday();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastHabitDate = toDate(input.lastHabitCompletedAt);

  let newCurrentStreak = input.currentStreak;

  if (!lastHabitDate) {
    // First-ever habit completion
    newCurrentStreak = 1;
  } else {
    lastHabitDate.setHours(0, 0, 0, 0);

    if (lastHabitDate.getTime() === yesterday.getTime()) {
      // Last completion was yesterday → extend streak
      newCurrentStreak = input.currentStreak + 1;
    } else if (lastHabitDate.getTime() < yesterday.getTime()) {
      // Gap detected → reset streak
      newCurrentStreak = 1;
    }
    // If last completion was today (already completed another habit today),
    // keep streak unchanged — no increment for multiple habits on same day
  }

  const newLongestStreak =
    newCurrentStreak > input.longestStreak
      ? newCurrentStreak
      : input.longestStreak;

  return { newCurrentStreak, newLongestStreak };
}
