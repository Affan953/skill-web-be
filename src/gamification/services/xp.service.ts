import { Injectable } from '@nestjs/common';
import { HabitDifficulty } from '../../habits/habits.interface';
import { XP_REWARD_MAP } from '../constants/xp.constants';

// ─────────────────────────────────────────────────────────────────────────────
// XpService
//
// Responsible for all XP-related calculations.
// No Firestore access — this service works with raw numbers only.
// Firestore writes are handled by the calling service (HabitsService).
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class XpService {
  /**
   * Returns the XP reward for a given habit difficulty level.
   * This is the single authoritative source for XP reward values.
   *
   * @param difficulty - The difficulty enum value of the habit
   * @returns XP reward amount (10, 20, or 30)
   */
  calculateReward(difficulty: HabitDifficulty): number {
    return XP_REWARD_MAP[difficulty];
  }

  /**
   * Adds the given XP amount to the current XP total.
   *
   * @param currentXp - Current accumulated XP
   * @param xpToAdd - Amount of XP to add
   * @returns New total XP
   */
  addXP(currentXp: number, xpToAdd: number): number {
    return currentXp + xpToAdd;
  }

  /**
   * Removes the given XP amount from the current XP total.
   * XP will never go below 0.
   *
   * @param currentXp - Current accumulated XP
   * @param xpToRemove - Amount of XP to remove
   * @returns New total XP (minimum 0)
   */
  removeXP(currentXp: number, xpToRemove: number): number {
    return Math.max(0, currentXp - xpToRemove);
  }
}
