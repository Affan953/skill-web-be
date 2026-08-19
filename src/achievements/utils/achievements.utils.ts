import { Timestamp } from 'firebase-admin/firestore';
import {
  AchievementDefinition,
  AchievementCategory,
} from '../achievements.constants';
import { Achievement, UserStats } from '../achievements.interface';
import { AchievementResponseDto } from '../dto/achievement-response.dto';

// ─────────────────────────────────────────────────────────────────────────────
// Achievement Utilities
//
// Pure, side-effect-free functions used by AchievementsService.
// No NestJS decorators. No Firestore writes.
// Fully unit-testable without mocking any provider.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a Firestore Timestamp, a Date, or null/undefined to a plain Date.
 * Returns null when the value is absent.
 */
export function toDate(
  value: Timestamp | Date | null | undefined,
): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  // Firestore Timestamp
  if (typeof value.toDate === 'function') {
    return value.toDate();
  }
  return null;
}

/**
 * Resolves the current progress value for a given achievement definition
 * based on the user's current statistics.
 *
 * @param definition - Static achievement metadata
 * @param stats      - Current snapshot of the user's stats
 * @returns          - Progress clamped to [0, target]
 */
export function resolveProgress(
  definition: AchievementDefinition,
  stats: UserStats,
): number {
  let raw = 0;

  switch (definition.category) {
    case AchievementCategory.Habit:
      raw = stats.totalHabits;
      break;
    case AchievementCategory.Xp:
      raw = stats.xp;
      break;
    case AchievementCategory.Level:
      raw = stats.level;
      break;
    case AchievementCategory.Streak:
      raw = stats.currentStreak;
      break;
    case AchievementCategory.Special:
      raw = 0;
      break;
  }

  return Math.min(raw, definition.target);
}

/**
 * Returns true when the user's stats satisfy the unlock condition
 * for the given achievement.
 */
export function isMet(
  definition: AchievementDefinition,
  stats: UserStats,
): boolean {
  return resolveProgress(definition, stats) >= definition.target;
}

/**
 * Maps a Firestore-stored Achievement document (plus its id) to the
 * clean AchievementResponseDto returned to clients.
 */
export function mapToResponseDto(
  achievement: Achievement,
): AchievementResponseDto {
  const dto = new AchievementResponseDto();
  dto.id = achievement.id;
  dto.title = achievement.title;
  dto.description = achievement.description;
  dto.icon = achievement.icon;
  dto.category = achievement.category;
  dto.unlocked = achievement.unlocked;
  dto.unlockedAt = achievement.unlockedAt;
  dto.progress = achievement.progress;
  dto.target = achievement.target;
  return dto;
}

/**
 * Builds a locked (default) Achievement object from a static definition
 * and the user's current statistics. Used during initialization and listing.
 */
export function buildDefaultAchievement(
  definition: AchievementDefinition,
  stats: UserStats,
): Achievement {
  return {
    id: definition.id,
    title: definition.title,
    description: definition.description,
    icon: definition.icon,
    category: definition.category,
    unlocked: false,
    unlockedAt: null,
    progress: resolveProgress(definition, stats),
    target: definition.target,
  };
}
