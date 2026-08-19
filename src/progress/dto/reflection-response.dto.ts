export interface ReflectionEntry {
  id: string;
  habitId: string;
  title: string;
  category: string;
  reflection: string;
  proofOfProgress?: Record<string, any>;
  sessionMetadata?: {
    durationMinutes?: number;
    startedAt?: string;
    completedAt?: string;
  };
  proudOf?: string;
  challenged?: string;
  improve?: string;
  xpEarned: number;
  streakAfter: number;
  levelAfter: number;
  createdAt: string;
}

export interface ReflectionSummary {
  totalReflections: number;
  weeklyReflections: number;
  categoriesExplored: string[];
  weeklyXpFromReflections: number;
  streakDays: number;
  averageReflectionLength: number;
}

export interface WeeklyReview {
  weekStart: string;
  weekEnd: string;
  habitsCompleted: number;
  xpEarned: number;
  reflectionCount: number;
  bestCategory: string;
  longestStreak: number;
  mostActiveDay: string;
  mostProductiveHour: string;
  personalInsight: string;
  dailyBreakdown: { day: string; completions: number; xp: number }[];
}

export interface MonthlyReview {
  month: string;
  year: number;
  totalHabitsCompleted: number;
  totalXpEarned: number;
  totalReflections: number;
  bestCategory: string;
  longestStreak: number;
  categoryBreakdown: { category: string; count: number; xp: number }[];
  xpByWeek: { week: string; xp: number }[];
  consistencyScore: number;
  growthSummary: string;
}
