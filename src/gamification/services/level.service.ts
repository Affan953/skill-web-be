import { Injectable } from '@nestjs/common';
import {
  calculateLevel,
  getLevelStartXP,
  getNextLevelXP,
  getLevelProgress,
} from '../utils/level.util';

// ─────────────────────────────────────────────────────────────────────────────
// LevelService
//
// Responsible for all level-related calculations.
// Delegates to level.util.ts for the pure formulas.
// No Firestore access — works with raw numbers only.
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class LevelService {
  /**
   * Calculates the user's level from their total XP.
   * Formula: floor(xp / 100) + 1
   *
   * @param xp - Total accumulated XP
   * @returns Current level (minimum 1)
   */
  calculateLevel(xp: number): number {
    return calculateLevel(xp);
  }

  /**
   * Returns the XP at which the current level began.
   *
   * @param level - Current level
   * @returns XP value at the start of this level
   */
  getCurrentLevelXP(level: number): number {
    return getLevelStartXP(level);
  }

  /**
   * Returns the XP required to reach the next level.
   *
   * @param level - Current level
   * @returns XP threshold for the next level
   */
  getNextLevelXP(level: number): number {
    return getNextLevelXP(level);
  }

  /**
   * Returns fractional progress (0.0 to 1.0) through the current level.
   *
   * @param xp - Total accumulated XP
   * @returns Progress fraction (e.g. 0.5 = halfway through current level)
   */
  getProgress(xp: number): number {
    return getLevelProgress(xp);
  }
}
