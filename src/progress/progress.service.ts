import { Injectable, Inject } from '@nestjs/common';
import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { FIRESTORE_DB } from '../firebase/firebase.provider';
import { toDate } from '../gamification/utils/date.util';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface XpHistoryEntry {
  id: string;
  xpGained: number;
  source: string;
  createdAt: Date | Timestamp;
  totalXpAfterGain: number;
}

export interface HabitHistoryEntry {
  id: string;
  habitId: string;
  title: string;
  category: string;
  xpEarned: number;
  completedAt: Date | Timestamp;
  streakAfterCompletion: number;
}

export interface CategoryStats {
  category: string;
  completionCount: number;
  completionRate: number;
  totalXP: number;
  averagePerWeek: number;
}

export interface UserStatistics {
  xpChartData: { day: string; xp: number }[];
  weeklyActivity: { day: string; completions: number }[];
  categoryStats: CategoryStats[];
  completionTimeline: { date: string; completions: number; xp: number }[];
  dailyXp: { date: string; xp: number }[];
  monthlyXp: { month: string; xp: number }[];
}

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class ProgressService {
  constructor(@Inject(FIRESTORE_DB) private readonly firestore: Firestore) {}

  // ─── Collection Helpers ──────────────────────────────────────────────────

  private xpHistoryCollection(uid: string) {
    return this.firestore.collection(`users/${uid}/xp-history`);
  }

  private habitHistoryCollection(uid: string) {
    return this.firestore.collection(`users/${uid}/habit-history`);
  }

  private habitsCollection(uid: string) {
    return this.firestore.collection(`users/${uid}/habits`);
  }

  // ─── Write: XP History ───────────────────────────────────────────────────

  async addXpHistory(
    uid: string,
    xpGained: number,
    source: string,
    totalXpAfterGain: number,
  ): Promise<void> {
    await this.xpHistoryCollection(uid).add({
      xpGained,
      source,
      totalXpAfterGain,
      createdAt: new Date(),
    });
  }

  // ─── Write: Habit History ────────────────────────────────────────────────

  async addHabitHistory(
    uid: string,
    habitId: string,
    title: string,
    category: string,
    xpEarned: number,
    streakAfterCompletion: number,
  ): Promise<void> {
    await this.habitHistoryCollection(uid).add({
      habitId,
      title,
      category,
      xpEarned,
      streakAfterCompletion,
      completedAt: new Date(),
    });
  }

  // ─── Read: XP History ────────────────────────────────────────────────────

  async getXpHistory(uid: string): Promise<XpHistoryEntry[]> {
    const snapshot = await this.xpHistoryCollection(uid)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as XpHistoryEntry[];
  }

  // ─── Read: Habit History ─────────────────────────────────────────────────

  async getHabitHistory(uid: string): Promise<HabitHistoryEntry[]> {
    const snapshot = await this.habitHistoryCollection(uid)
      .orderBy('completedAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as HabitHistoryEntry[];
  }

  // ─── Read: User Statistics ───────────────────────────────────────────────

  async getUserStatistics(uid: string): Promise<UserStatistics> {
    const [xpHistorySnap, habitHistorySnap, habitsSnap] = await Promise.all([
      this.xpHistoryCollection(uid).orderBy('createdAt', 'asc').get(),
      this.habitHistoryCollection(uid).orderBy('completedAt', 'asc').get(),
      this.habitsCollection(uid).get(),
    ]);

    const xpHistory = xpHistorySnap.docs.map((d) => d.data());
    const habitHistory = habitHistorySnap.docs.map((d) => d.data());
    const allHabits = habitsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    // ── XP Chart Data (last 7 days, cumulative XP per day) ──────────────
    const xpChartData = this.buildXpChartData(xpHistory);

    // ── Weekly Activity (completions by day of week) ─────────────────────
    const weeklyActivity = this.buildWeeklyActivity(habitHistory);

    // ── Category Stats ──────────────────────────────────────────────────
    const categoryStats = this.buildCategoryStats(habitHistory, allHabits);

    // ── Completion Timeline (last 30 days) ──────────────────────────────
    const completionTimeline = this.buildCompletionTimeline(habitHistory);

    // ── Daily XP (last 30 days) ─────────────────────────────────────────
    const dailyXp = this.buildDailyXp(xpHistory);

    // ── Monthly XP (last 6 months) ─────────────────────────────────────
    const monthlyXp = this.buildMonthlyXp(xpHistory);

    return {
      xpChartData,
      weeklyActivity,
      categoryStats,
      completionTimeline,
      dailyXp,
      monthlyXp,
    };
  }

  // ─── Internal Builders ──────────────────────────────────────────────────

  private buildXpChartData(
    xpHistory: FirebaseFirestore.DocumentData[],
  ): { day: string; xp: number }[] {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const now = new Date();

    // Get start of each day for the last 7 days
    const dayStarts: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      dayStarts.push(d);
    }

    // Sum XP per day
    const xpPerDay = new Map<number, number>();
    for (const entry of xpHistory) {
      const date = toDate(entry['createdAt']);
      if (!date) continue;
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const key = dayStart.getTime();
      xpPerDay.set(key, (xpPerDay.get(key) ?? 0) + (entry['xpGained'] ?? 0));
    }

    return dayStarts.map((dayStart) => ({
      day: days[(dayStart.getDay() + 6) % 7],
      xp: xpPerDay.get(dayStart.getTime()) ?? 0,
    }));
  }

  private buildWeeklyActivity(
    habitHistory: FirebaseFirestore.DocumentData[],
  ): { day: string; completions: number }[] {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const counts = [0, 0, 0, 0, 0, 0, 0];

    for (const entry of habitHistory) {
      const date = toDate(entry['completedAt']);
      if (!date) continue;
      const dayIdx = (date.getDay() + 6) % 7;
      counts[dayIdx]++;
    }

    return days.map((day, i) => ({ day, completions: counts[i] }));
  }

  private buildCategoryStats(
    habitHistory: FirebaseFirestore.DocumentData[],
    allHabits: FirebaseFirestore.DocumentData[],
  ): CategoryStats[] {
    const CATEGORIES = [
      'Learning',
      'Fitness',
      'Reading',
      'Meditation',
      'Coding',
      'Health',
      'Productivity',
      'Finance',
      'Language',
      'Custom',
    ];

    const statsMap = new Map<
      string,
      { completions: number; xp: number; habitCount: number }
    >();

    for (const cat of CATEGORIES) {
      statsMap.set(cat, { completions: 0, xp: 0, habitCount: 0 });
    }

    // Count habits per category
    for (const habit of allHabits) {
      const cat = habit['category'] as string;
      if (statsMap.has(cat)) {
        statsMap.get(cat)!.habitCount++;
      }
    }

    // Count completions and XP per category
    for (const entry of habitHistory) {
      const cat = entry['category'] as string;
      if (statsMap.has(cat)) {
        const s = statsMap.get(cat)!;
        s.completions++;
        s.xp += (entry['xpEarned'] ?? 0) as number;
      }
    }

    // Calculate averages (assume ~4 weeks in a month for "per week")
    return CATEGORIES.map((cat) => {
      const s = statsMap.get(cat)!;
      const uniqueHabits = s.habitCount;
      // Completion rate: completions / (habits * weeks active) — simplified
      const weeksActive = Math.max(
        1,
        Math.ceil(s.completions / Math.max(1, uniqueHabits)),
      );
      return {
        category: cat,
        completionCount: s.completions,
        completionRate:
          uniqueHabits > 0
            ? Math.round(
                (s.completions / (uniqueHabits * Math.max(1, weeksActive))) *
                  100,
              )
            : 0,
        totalXP: s.xp,
        averagePerWeek: Math.round(s.completions / Math.max(1, weeksActive)),
      };
    });
  }

  private buildCompletionTimeline(
    habitHistory: FirebaseFirestore.DocumentData[],
  ): { date: string; completions: number; xp: number }[] {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const dayMap = new Map<string, { completions: number; xp: number }>();

    for (const entry of habitHistory) {
      const date = toDate(entry['completedAt']);
      if (!date || date < thirtyDaysAgo) continue;
      const key = date.toISOString().slice(0, 10);
      const existing = dayMap.get(key) ?? { completions: 0, xp: 0 };
      existing.completions++;
      existing.xp += (entry['xpEarned'] ?? 0) as number;
      dayMap.set(key, existing);
    }

    const result: { date: string; completions: number; xp: number }[] = [];
    for (let i = 30; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const existing = dayMap.get(key);
      result.push({
        date: key,
        completions: existing?.completions ?? 0,
        xp: existing?.xp ?? 0,
      });
    }

    return result;
  }

  private buildDailyXp(
    xpHistory: FirebaseFirestore.DocumentData[],
  ): { date: string; xp: number }[] {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const dayMap = new Map<string, number>();

    for (const entry of xpHistory) {
      const date = toDate(entry['createdAt']);
      if (!date || date < thirtyDaysAgo) continue;
      const key = date.toISOString().slice(0, 10);
      dayMap.set(key, (dayMap.get(key) ?? 0) + (entry['xpGained'] ?? 0));
    }

    const result: { date: string; xp: number }[] = [];
    for (let i = 30; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, xp: dayMap.get(key) ?? 0 });
    }

    return result;
  }

  private buildMonthlyXp(
    xpHistory: FirebaseFirestore.DocumentData[],
  ): { month: string; xp: number }[] {
    const now = new Date();
    const monthMap = new Map<string, number>();

    for (const entry of xpHistory) {
      const date = toDate(entry['createdAt']);
      if (!date) continue;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(
        monthKey,
        (monthMap.get(monthKey) ?? 0) + (entry['xpGained'] ?? 0),
      );
    }

    const result: { month: string; xp: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleString('en-US', {
        month: 'short',
        year: '2-digit',
      });
      result.push({ month: monthLabel, xp: monthMap.get(monthKey) ?? 0 });
    }

    return result;
  }
}
