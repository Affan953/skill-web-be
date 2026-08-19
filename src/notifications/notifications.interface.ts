export enum NotificationType {
  HabitReminder = 'HABIT_REMINDER',
  HabitCompleted = 'HABIT_COMPLETED',
  DailyQuestCompleted = 'DAILY_QUEST_COMPLETED',
  AchievementUnlocked = 'ACHIEVEMENT_UNLOCKED',
  LevelUp = 'LEVEL_UP',
  StreakMilestone = 'STREAK_MILESTONE',
  ReflectionSaved = 'REFLECTION_SAVED',
  JourneySaved = 'JOURNEY_SAVED',
  WeeklyReview = 'WEEKLY_REVIEW',
  MonthlyReview = 'MONTHLY_REVIEW',
  System = 'SYSTEM',
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: Date | any;
}
