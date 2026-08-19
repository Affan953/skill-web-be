// ─────────────────────────────────────────────────────────────────────────────
// Achievement Constants
//
// Single source of truth for every achievement in SkillUp RPG.
// No magic strings. Every ID, title, description, icon, category,
// and target value is defined exactly once here.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All valid achievement categories.
 */
export enum AchievementCategory {
  Habit = 'Habit',
  Level = 'Level',
  Xp = 'XP',
  Streak = 'Streak',
  Special = 'Special',
}

/**
 * Static definition of a single achievement.
 * Used only at definition time — never written to Firestore.
 */
export interface AchievementDefinition {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly category: AchievementCategory;
  /** The numeric value a user stat must reach to unlock this achievement. */
  readonly target: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Achievement Registry
// ─────────────────────────────────────────────────────────────────────────────

export const ACHIEVEMENTS = {
  // ── Habit milestones ────────────────────────────────────────────────────────
  FIRST_STEP: {
    id: 'first_step',
    title: 'First Step',
    description: 'Complete your first habit.',
    icon: '👣',
    category: AchievementCategory.Habit,
    target: 1,
  },
  HABIT_BEGINNER: {
    id: 'habit_beginner',
    title: 'Habit Beginner',
    description: 'Complete 10 habits.',
    icon: '🌱',
    category: AchievementCategory.Habit,
    target: 10,
  },
  HABIT_EXPERT: {
    id: 'habit_expert',
    title: 'Habit Expert',
    description: 'Complete 50 habits.',
    icon: '⚡',
    category: AchievementCategory.Habit,
    target: 50,
  },
  HABIT_MASTER: {
    id: 'habit_master',
    title: 'Habit Master',
    description: 'Complete 100 habits.',
    icon: '👑',
    category: AchievementCategory.Habit,
    target: 100,
  },

  // ── XP milestones ───────────────────────────────────────────────────────────
  XP_COLLECTOR: {
    id: 'xp_collector',
    title: 'XP Collector',
    description: 'Reach 100 XP.',
    icon: '✨',
    category: AchievementCategory.Xp,
    target: 100,
  },
  XP_HUNTER: {
    id: 'xp_hunter',
    title: 'XP Hunter',
    description: 'Reach 500 XP.',
    icon: '🎯',
    category: AchievementCategory.Xp,
    target: 500,
  },
  XP_MASTER: {
    id: 'xp_master',
    title: 'XP Master',
    description: 'Reach 1000 XP.',
    icon: '🏅',
    category: AchievementCategory.Xp,
    target: 1000,
  },

  // ── Level milestones ────────────────────────────────────────────────────────
  LEVEL_5: {
    id: 'level_5',
    title: 'Level 5',
    description: 'Reach level 5.',
    icon: '🛡️',
    category: AchievementCategory.Level,
    target: 5,
  },
  LEVEL_10: {
    id: 'level_10',
    title: 'Level 10',
    description: 'Reach level 10.',
    icon: '⚔️',
    category: AchievementCategory.Level,
    target: 10,
  },
  LEVEL_20: {
    id: 'level_20',
    title: 'Level 20',
    description: 'Reach level 20.',
    icon: '🔮',
    category: AchievementCategory.Level,
    target: 20,
  },

  // ── Streak milestones ───────────────────────────────────────────────────────
  STREAK_3: {
    id: 'streak_3',
    title: '3 Day Streak',
    description: 'Maintain a habit streak for 3 consecutive days.',
    icon: '🔥',
    category: AchievementCategory.Streak,
    target: 3,
  },
  STREAK_7: {
    id: 'streak_7',
    title: '7 Day Streak',
    description: 'Maintain a habit streak for 7 consecutive days.',
    icon: '☄️',
    category: AchievementCategory.Streak,
    target: 7,
  },
  STREAK_30: {
    id: 'streak_30',
    title: '30 Day Streak',
    description: 'Maintain a habit streak for 30 consecutive days.',
    icon: '💥',
    category: AchievementCategory.Streak,
    target: 30,
  },
} as const satisfies Record<string, AchievementDefinition>;

/**
 * Flat array of every achievement — useful for initialization and listing.
 */
export const ACHIEVEMENT_LIST: AchievementDefinition[] =
  Object.values(ACHIEVEMENTS);
