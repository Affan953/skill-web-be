import { Injectable } from '@nestjs/common';
import {
  calculateHabitStreak,
  calculateUserStreak,
  HabitStreakInput,
  UserStreakInput,
  StreakResult,
} from '../utils/streak.util';

// ─────────────────────────────────────────────────────────────────────────────
// StreakService
//
// Responsible for all streak-related calculations.
// Delegates to streak.util.ts for pure, testable logic.
// No Firestore access — works with raw values only.
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class StreakService {
  /**
   * Calculates the new streak count for a specific habit being completed.
   *
   * Rules:
   * - Last completed yesterday → increment streak
   * - Last completed before yesterday (gap) → reset to 1
   * - Never completed → start at 1
   *
   * @param input - Current streak count and last completion timestamp
   * @returns New streak count
   */
  calculateHabitStreak(input: HabitStreakInput): number {
    return calculateHabitStreak(input);
  }

  /**
   * Calculates the user's updated current and longest streaks
   * based on when they last completed any habit.
   *
   * Rules:
   * - Last completion was yesterday → increment current streak
   * - Last completion was before yesterday → reset to 1
   * - First completion ever → start at 1
   * - Last completion was today → keep streak (multiple habits, same day)
   * - longestStreak updates if currentStreak exceeds it
   *
   * @param input - User's current streak, longest streak, and last completion timestamp
   * @returns Updated currentStreak and longestStreak
   */
  calculateUserStreak(input: UserStreakInput): StreakResult {
    return calculateUserStreak(input);
  }
}
