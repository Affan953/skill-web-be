/**
 * Interface representing a daily quest instance stored in Firestore.
 * Path: users/{uid}/dailyQuests/{questId}
 */
export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  category: 'Habit' | 'XP' | 'Streak';
  target: number;
  progress: number;
  rewardXP: number;
  completed: boolean;
  completedAt: Date | null;
  createdAt: Date;
  expiresAt: Date;
}
