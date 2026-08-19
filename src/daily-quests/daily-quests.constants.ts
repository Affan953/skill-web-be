/**
 * Static definition for a Daily Quest.
 */
export interface DailyQuestDefinition {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: 'Habit' | 'XP' | 'Streak';
  readonly target: number;
  readonly rewardXP: number;
  readonly subtype?: 'Learning' | 'Health';
}

/**
 * Registry of all 6 default daily quests in SkillUp RPG.
 * Used for populating today's fresh quest set.
 */
export const DAILY_QUEST_DEFINITIONS: DailyQuestDefinition[] = [
  {
    id: 'complete_1_habit',
    title: 'Complete 1 Habit',
    description: 'Complete at least one habit today.',
    category: 'Habit',
    target: 1,
    rewardXP: 20,
  },
  {
    id: 'complete_3_habits',
    title: 'Complete 3 Habits',
    description: 'Complete three habits today.',
    category: 'Habit',
    target: 3,
    rewardXP: 50,
  },
  {
    id: 'complete_1_learning_habit',
    title: 'Complete 1 Learning Habit',
    description: 'Complete one learning-related habit today.',
    category: 'Habit',
    target: 1,
    rewardXP: 30,
    subtype: 'Learning',
  },
  {
    id: 'complete_1_health_habit',
    title: 'Complete 1 Health Habit',
    description: 'Complete one health-related habit today.',
    category: 'Habit',
    target: 1,
    rewardXP: 30,
    subtype: 'Health',
  },
  {
    id: 'earn_100_xp_today',
    title: 'Earn 100 XP Today',
    description: 'Earn a total of 100 XP from completing habits today.',
    category: 'XP',
    target: 100,
    rewardXP: 40,
  },
  {
    id: 'maintain_todays_streak',
    title: "Maintain Today's Streak",
    description: 'Complete a habit to keep your daily streak alive.',
    category: 'Streak',
    target: 1,
    rewardXP: 20,
  },
];
