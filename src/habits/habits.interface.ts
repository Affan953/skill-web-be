// ─────────────────────────────────────────────
// Habit Category Enum
// ─────────────────────────────────────────────
export enum HabitCategory {
  Learning = 'Learning',
  Fitness = 'Fitness',
  Reading = 'Reading',
  Meditation = 'Meditation',
  Coding = 'Coding',
  Health = 'Health',
  Productivity = 'Productivity',
  Finance = 'Finance',
  Language = 'Language',
  Custom = 'Custom',
}

// ─────────────────────────────────────────────
// Habit Difficulty Enum
// ─────────────────────────────────────────────
export enum HabitDifficulty {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard',
}

// ─────────────────────────────────────────────
// XP Reward Map — re-exported from gamification
// The source of truth has moved to:
// src/gamification/constants/xp.constants.ts
// ─────────────────────────────────────────────
export { XP_REWARD_MAP } from '../gamification/constants/xp.constants';

// ─────────────────────────────────────────────
// Session Goal Type — flexible, user-defined goal
// The USER always decides their own session target.
// ─────────────────────────────────────────────
export type SessionGoalKind =
  'duration' | 'distance' | 'counter' | 'pages' | 'sleep' | 'money' | 'custom';

export interface SessionGoal {
  activity: string | null;
  goalLabel: string | null;
  goalValue: number | null;
  goalUnit: string | null;
}

// ─────────────────────────────────────────────
// Habit Document Interface (Firestore schema)
// users/{uid}/habits/{habitId}
// ─────────────────────────────────────────────
export interface Habit extends SessionGoal {
  id: string;
  title: string;
  description: string | null;
  category: HabitCategory;
  difficulty: HabitDifficulty;
  xpReward: number;
  reminderTime: string | null;
  isCompleted: boolean;
  streak: number;
  createdAt: Date | any;
  updatedAt: Date | any;
  completedAt: Date | any | null;
}
